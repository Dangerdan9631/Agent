import path from 'node:path';
import fse from 'fs-extra';

import {
  PROJECT_METADATA_RELATIVE_PATH,
  PROJECT_METADATA_SCHEMA_VERSION,
} from '../core/project-metadata.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../workflow/artifacts.js';
import {
  readProjectMetadataTolerant,
  readWorkflowConfigTolerant,
} from '../config/reader.js';
import {
  projectMetadataSchema,
  workflowConfigSchema,
  type ProjectMetadata,
  type WorkflowConfig,
} from '../config/schema.js';
import { atomicWriteJson } from '../core/atomic-write.js';

/**
 * Current workflow configuration schema version written by migrations.
 */
export const WORKFLOW_CONFIG_SCHEMA_VERSION = '2';

export { PROJECT_METADATA_SCHEMA_VERSION } from '../core/project-metadata.js';

/**
 * Error thrown when a breaking migration is blocked pending explicit confirmation.
 */
export class BreakingMigrationError extends Error {
  /**
   * Creates a breaking migration error with a remediation message.
   *
   * @param message - Human-readable explanation of the blocked migration.
   */
  constructor(message: string) {
    super(message);
    this.name = 'BreakingMigrationError';
  }
}

/**
 * One planned migration for a user-owned configuration file.
 */
export interface ConfigMigrationPlanEntry {
  /**
   * Project-relative path to the config file to migrate.
   */
  relativePath: string;
  /**
   * Schema version read from disk before migration.
   */
  fromSchemaVersion: string;
  /**
   * Schema version that will be written after migration.
   */
  toSchemaVersion: string;
  /**
   * When true, the migration removes or rewrites data and requires explicit confirmation.
   */
  breaking: boolean;
  /**
   * Short summary of the migration for update summaries.
   */
  description: string;
}

/**
 * Planned migrations across all user-owned configuration files.
 */
export interface ConfigMigrationPlan {
  /**
   * Ordered list of config file migrations to apply.
   */
  migrations: ConfigMigrationPlanEntry[];
  /**
   * Count of migrations marked as breaking.
   */
  breakingCount: number;
}

/**
 * Options controlling how migrations are applied during update.
 */
export interface ApplyMigrationOptions {
  /**
   * Toolkit semver to record in migrated configuration files.
   */
  targetToolkitVersion: string;
  /**
   * When true, allows breaking migrations without a separate confirmation step.
   */
  force?: boolean;
}

/**
 * Result after applying zero or more configuration migrations.
 */
export interface ApplyMigrationResult {
  /**
   * Migrations that were written to disk.
   */
  applied: ConfigMigrationPlanEntry[];
}

/**
 * Builds the workflow configuration document at the current schema version.
 *
 * @param tolerant - Normalized workflow config parsed from any prior schema version.
 * @param targetToolkitVersion - Toolkit semver to record in the migrated document.
 * @returns Validated workflow configuration ready to persist.
 */
function buildMigratedWorkflowConfig(
  tolerant: ReturnType<typeof readWorkflowConfigTolerant>,
  targetToolkitVersion: string,
): WorkflowConfig {
  const migrated: WorkflowConfig = {
    schemaVersion: WORKFLOW_CONFIG_SCHEMA_VERSION,
    toolkitVersion: targetToolkitVersion,
    agents: tolerant.agents,
    steps: tolerant.steps,
    workflows: tolerant.workflows,
    defaultWorkflowId: tolerant.defaultWorkflowId,
    extensions: tolerant.extensions,
  };

  return workflowConfigSchema.parse(migrated);
}

/**
 * Builds the project metadata document at the current schema version.
 *
 * @param tolerant - Normalized metadata parsed from any prior schema version.
 * @returns Validated project metadata ready to persist.
 */
function buildMigratedProjectMetadata(
  tolerant: ReturnType<typeof readProjectMetadataTolerant>,
): ProjectMetadata {
  const migrated: ProjectMetadata = {
    schemaVersion: PROJECT_METADATA_SCHEMA_VERSION,
    nextTaskSpecId: tolerant.nextTaskSpecId,
    currentTaskSpecId: tolerant.currentTaskSpecId ?? null,
    currentTaskSlug: tolerant.currentTaskSlug ?? null,
    implementationStartedAt: tolerant.implementationStartedAt ?? null,
    updatedAt: tolerant.updatedAt,
  };

  return projectMetadataSchema.parse(migrated);
}

/**
 * Returns whether a workflow config document needs schema or toolkit version migration.
 *
 * @param tolerant - Normalized workflow configuration from disk.
 * @param targetToolkitVersion - Toolkit semver for the running update.
 * @returns True when the workflow config should be rewritten.
 */
function workflowConfigNeedsMigration(
  tolerant: ReturnType<typeof readWorkflowConfigTolerant>,
  targetToolkitVersion: string,
): boolean {
  return (
    tolerant.schemaVersion !== WORKFLOW_CONFIG_SCHEMA_VERSION ||
    tolerant.toolkitVersion !== targetToolkitVersion
  );
}

/**
 * Returns whether project metadata needs schema normalization migration.
 *
 * @param tolerant - Normalized project metadata from disk.
 * @returns True when metadata should be rewritten to the current schema version.
 */
function projectMetadataNeedsMigration(
  tolerant: ReturnType<typeof readProjectMetadataTolerant>,
): boolean {
  return tolerant.schemaVersion !== PROJECT_METADATA_SCHEMA_VERSION;
}

/**
 * Plans user-owned configuration migrations for an update without writing files.
 *
 * @param projectRoot - Absolute path to the initialized project root.
 * @param targetToolkitVersion - Toolkit semver from the running package.
 * @returns Migration plan including breaking-change markers.
 */
export async function planUserConfigMigrations(
  projectRoot: string,
  targetToolkitVersion: string,
): Promise<ConfigMigrationPlan> {
  const migrations: ConfigMigrationPlanEntry[] = [];

  const workflowPath = path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH);
  if (await fse.pathExists(workflowPath)) {
    const raw: unknown = await fse.readJson(workflowPath);
    const tolerant = readWorkflowConfigTolerant(raw);

    if (workflowConfigNeedsMigration(tolerant, targetToolkitVersion)) {
      const breaking = tolerant.legacyTierRouting != null;
      migrations.push({
        relativePath: WORKFLOW_CONFIG_RELATIVE_PATH,
        fromSchemaVersion: tolerant.schemaVersion,
        toSchemaVersion: WORKFLOW_CONFIG_SCHEMA_VERSION,
        breaking,
        description: breaking
          ? 'Remove deprecated legacyTierRouting and normalize workflow config to schema v2'
          : 'Normalize workflow config field names and update schema to v2',
      });
    }
  }

  const metadataPath = path.join(projectRoot, PROJECT_METADATA_RELATIVE_PATH);
  if (await fse.pathExists(metadataPath)) {
    const raw: unknown = await fse.readJson(metadataPath);
    const tolerant = readProjectMetadataTolerant(raw);

    if (projectMetadataNeedsMigration(tolerant)) {
      migrations.push({
        relativePath: PROJECT_METADATA_RELATIVE_PATH,
        fromSchemaVersion: tolerant.schemaVersion,
        toSchemaVersion: PROJECT_METADATA_SCHEMA_VERSION,
        breaking: false,
        description: 'Normalize project metadata field names and update schema version',
      });
    }
  }

  return {
    migrations,
    breakingCount: migrations.filter((entry) => entry.breaking).length,
  };
}

/**
 * Applies planned configuration migrations, enforcing breaking-change confirmation rules.
 *
 * @param projectRoot - Absolute path to the initialized project root.
 * @param plan - Migration plan from `planUserConfigMigrations`.
 * @param options - Target toolkit version and confirmation flags.
 * @returns List of migrations written to disk.
 */
export async function applyUserConfigMigrations(
  projectRoot: string,
  plan: ConfigMigrationPlan,
  options: ApplyMigrationOptions,
): Promise<ApplyMigrationResult> {
  if (plan.breakingCount > 0 && options.force !== true) {
    throw new BreakingMigrationError('Breaking config migration requires --force.');
  }

  const applied: ConfigMigrationPlanEntry[] = [];

  for (const migration of plan.migrations) {
    if (migration.relativePath === WORKFLOW_CONFIG_RELATIVE_PATH) {
      const workflowPath = path.join(projectRoot, migration.relativePath);
      const raw: unknown = await fse.readJson(workflowPath);
      const tolerant = readWorkflowConfigTolerant(raw);
      const migrated = buildMigratedWorkflowConfig(tolerant, options.targetToolkitVersion);
      await atomicWriteJson(workflowPath, migrated);
      applied.push(migration);
      continue;
    }

    if (migration.relativePath === PROJECT_METADATA_RELATIVE_PATH) {
      const metadataPath = path.join(projectRoot, migration.relativePath);
      const raw: unknown = await fse.readJson(metadataPath);
      const tolerant = readProjectMetadataTolerant(raw);
      const migrated = buildMigratedProjectMetadata(tolerant);
      await atomicWriteJson(metadataPath, migrated);
      applied.push(migration);
    }
  }

  return { applied };
}
