import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import fse from 'fs-extra';

import {
  getBundledAgentGenerator,
  installBundledExtensions,
  loadBundledExtensionManifest,
} from '../../agents/extension-loader.js';
import {
  buildCanonicalAgentsMdContent,
  CANONICAL_AGENTS_MD_RELATIVE_PATH,
} from '../../agents/generators/agents-md.js';
import { listWorkflowSkillUpdates } from '../../agents/generators/workflow-skills.js';
import {
  refreshConfiguredAgentMcpConfigs,
  type McpConfigRefreshResult,
} from '../../agents/mcp-config.js';
import { atomicWriteJson, atomicWriteText } from '../../core/atomic-write.js';
import { readWorkflowConfig } from '../../workflow/artifacts.js';
import {
  BUNDLED_SCRIPT_BASE_NAMES,
  installBundledPlatformScripts,
  PROJECT_SCRIPTS_RELATIVE_DIR,
} from '../../workflow/platform-scripts.js';
import type { WorkflowConfig } from '../../config/schema.js';
import {
  checkExtensionCompatibility,
  type ExtensionCompatibilityInput,
} from '../../extensions/compatibility.js';
import { extensionManifestSchema } from '../../extensions/manifest.js';
import { backupIfModified, type BackupConflict } from '../../updates/backup.js';
import {
  applyUserConfigMigrations,
  BreakingMigrationError,
  planUserConfigMigrations,
} from '../../updates/migration.js';
import { promptForUpdateConfirmation } from '../ink/update-prompts.js';
import {
  collectLauncherBinaryUpdates,
  installProjectBinaries,
} from '../local-binaries.js';
import { resolveToolkitRoot, WORKFLOW_CONFIG_RELATIVE_PATH } from './init.js';

/**
 * Options controlling toolkit update orchestration.
 */
export interface UpdateOptions {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * When true, report planned changes without writing files.
   */
  dryRun?: boolean;
  /**
   * When true, skip Ink confirmation prompts.
   */
  yes?: boolean;
  /**
   * When true, allow breaking migrations without interactive confirmation (US10 hook).
   */
  confirmMigration?: boolean;
  /**
   * Absolute path to the toolkit package root containing build outputs.
   */
  toolkitRoot?: string;
}

/**
 * Summary returned after an update run completes or dry-run planning finishes.
 */
export interface UpdateResult {
  /**
   * Absolute path to the updated project root.
   */
  projectRoot: string;
  /**
   * Toolkit version recorded in workflow configuration before update.
   */
  previousToolkitVersion: string;
  /**
   * Toolkit version from the running package used for this update.
   */
  targetToolkitVersion: string;
  /**
   * Project-relative toolkit-owned paths written during update.
   */
  overwrittenFiles: string[];
  /**
   * Toolkit-owned files that received `.bak` siblings before overwrite.
   */
  backupConflicts: BackupConflict[];
  /**
   * MCP configuration refresh results per agent target.
   */
  mcpRefresh: McpConfigRefreshResult[];
  /**
   * True when the run only planned changes.
   */
  dryRun: boolean;
  /**
   * Project-relative user-owned config paths migrated during update.
   */
  configMigrations: string[];
  /**
   * Extension compatibility advisory warnings surfaced in the update summary.
   */
  extensionWarnings: string[];
}

/**
 * One toolkit-owned file update with expected content from the running toolkit.
 */
interface ToolkitFileUpdate {
  /**
   * Project-relative destination path.
   */
  relativePath: string;
  /**
   * Expected file body after update.
   */
  expectedContent: string | Buffer;
}

/**
 * Reads the toolkit version from package.json at the toolkit root.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root.
 * @returns Semver string for the toolkit package.
 */
function readToolkitVersion(toolkitRoot: string): string {
  const packageJsonPath = path.join(toolkitRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
}

/**
 * Loads enabled extension manifests referenced by workflow configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param workflowConfig - Parsed workflow configuration for the project.
 * @returns Enabled extensions with validated manifests.
 */
async function loadEnabledExtensions(
  projectRoot: string,
  workflowConfig: WorkflowConfig,
): Promise<ExtensionCompatibilityInput[]> {
  const extensions: ExtensionCompatibilityInput[] = [];

  for (const extensionRef of workflowConfig.extensions ?? []) {
    if (!extensionRef.enabled) {
      continue;
    }

    const manifestPath = path.join(projectRoot, extensionRef.manifestPath);
    if (!(await fse.pathExists(manifestPath))) {
      continue;
    }

    const raw: unknown = await fse.readJson(manifestPath);
    extensions.push({
      id: extensionRef.id,
      manifest: extensionManifestSchema.parse(raw),
    });
  }

  return extensions;
}

async function resolveConfiguredAgentIds(projectRoot: string): Promise<string[]> {
  const workflowConfig = await readWorkflowConfig(projectRoot);
  if (workflowConfig == null) {
    throw new Error(
      `Project is not initialized. Run \`spec-n-roll init\` before update. Missing ${WORKFLOW_CONFIG_RELATIVE_PATH}.`,
    );
  }

  return workflowConfig.agents.filter((agent) => agent.enabled).map((agent) => agent.id).sort();
}

/**
 * Collects toolkit-owned text and JSON file updates for the configured agents.
 *
 * @param agentIds - Enabled bundled agent ids in the project.
 * @returns Relative paths and expected UTF-8 contents from the running toolkit.
 */
function collectTextToolkitUpdates(agentIds: readonly string[]): ToolkitFileUpdate[] {
  const updates: ToolkitFileUpdate[] = [
    {
      relativePath: CANONICAL_AGENTS_MD_RELATIVE_PATH,
      expectedContent: buildCanonicalAgentsMdContent(),
    },
    ...listWorkflowSkillUpdates().map((skill) => ({
      relativePath: skill.relativePath,
      expectedContent: skill.content,
    })),
  ];

  for (const agentId of agentIds) {
    const generator = getBundledAgentGenerator(agentId);
    if (generator == null) {
      continue;
    }
    const manifestPath = path.posix.join(
      '.spec-n-roll/bundled-extensions',
      agentId,
      'manifest.json',
    );
    updates.push({
      relativePath: manifestPath,
      expectedContent: `${JSON.stringify(generator.manifest, null, 2)}\n`,
    });
  }

  updates.push({
    relativePath: '.spec-n-roll/compatibility.json',
    expectedContent: `${JSON.stringify({ incompatibleCombinations: [] }, null, 2)}\n`,
  });

  return updates;
}

/**
 * Collects toolkit-owned platform script updates from bundled script pairs.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root.
 * @returns Relative script paths and expected file bodies.
 */
function collectPlatformScriptUpdates(toolkitRoot: string): ToolkitFileUpdate[] {
  const sourceDir = path.join(toolkitRoot, 'scripts');
  const updates: ToolkitFileUpdate[] = [];

  for (const scriptBaseName of BUNDLED_SCRIPT_BASE_NAMES) {
    for (const extension of ['.sh', '.ps1'] as const) {
      const sourcePath = path.join(sourceDir, `${scriptBaseName}${extension}`);
      if (!existsSync(sourcePath)) {
        continue;
      }
      updates.push({
        relativePath: path.posix.join(PROJECT_SCRIPTS_RELATIVE_DIR, `${scriptBaseName}${extension}`),
        expectedContent: readFileSync(sourcePath),
      });
    }
  }

  return updates;
}

/**
 * Detects toolkit-owned files that differ from expected update content.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param updates - Toolkit-owned file updates with expected content.
 * @returns Would-be backup conflicts without writing `.bak` files.
 */
async function detectModifiedToolkitFiles(
  projectRoot: string,
  updates: readonly ToolkitFileUpdate[],
): Promise<BackupConflict[]> {
  const conflicts: BackupConflict[] = [];

  for (const update of updates) {
    const absolutePath = path.join(projectRoot, update.relativePath);
    if (!(await fse.pathExists(absolutePath))) {
      continue;
    }

    const current = await fse.readFile(absolutePath);
    const expected = Buffer.isBuffer(update.expectedContent)
      ? update.expectedContent
      : Buffer.from(update.expectedContent, 'utf8');

    if (!current.equals(expected)) {
      conflicts.push({
        filePath: absolutePath,
        backupPath: `${absolutePath}.bak`,
      });
    }
  }

  return conflicts;
}

/**
 * Backs up locally modified toolkit-owned files before overwrite.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param updates - Toolkit-owned file updates with expected content.
 * @returns Backup conflicts for modified files.
 */
async function backupModifiedToolkitFiles(
  projectRoot: string,
  updates: readonly ToolkitFileUpdate[],
): Promise<BackupConflict[]> {
  const conflicts: BackupConflict[] = [];

  for (const update of updates) {
    const absolutePath = path.join(projectRoot, update.relativePath);
    const conflict = await backupIfModified(absolutePath, update.expectedContent);
    if (conflict != null) {
      conflicts.push(conflict);
    }
  }

  return conflicts;
}

/**
 * Writes toolkit-owned text and binary updates to the project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param updates - Toolkit-owned file updates with expected content.
 */
async function writeToolkitFileUpdates(
  projectRoot: string,
  updates: readonly ToolkitFileUpdate[],
): Promise<void> {
  for (const update of updates) {
    const absolutePath = path.join(projectRoot, update.relativePath);
    await fse.ensureDir(path.dirname(absolutePath));

    if (Buffer.isBuffer(update.expectedContent)) {
      await fse.writeFile(absolutePath, update.expectedContent);
      continue;
    }

    await atomicWriteText(absolutePath, update.expectedContent);
  }
}

/**
 * Applies toolkit-owned overwrite logic and MCP path refresh for an initialized project.
 *
 * @param options - Update path, dry-run, and non-interactive options.
 * @returns Update summary including backups and MCP refresh results.
 */
export async function runUpdate(options: UpdateOptions): Promise<UpdateResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const toolkitRoot = options.toolkitRoot ?? resolveToolkitRoot();
  const agentIds = await resolveConfiguredAgentIds(projectRoot);
  const workflowConfig = await readWorkflowConfig(projectRoot);
  if (workflowConfig == null) {
    throw new Error(
      `Project is not initialized. Run \`spec-n-roll init\` before update. Missing ${WORKFLOW_CONFIG_RELATIVE_PATH}.`,
    );
  }

  const previousToolkitVersion = workflowConfig.toolkitVersion;
  const targetToolkitVersion = readToolkitVersion(toolkitRoot);
  const migrationPlan = await planUserConfigMigrations(projectRoot, targetToolkitVersion);

  const textUpdates = collectTextToolkitUpdates(agentIds);
  const scriptUpdates = collectPlatformScriptUpdates(toolkitRoot);
  const binaryUpdates = collectLauncherBinaryUpdates();
  const allUpdates = [...textUpdates, ...scriptUpdates, ...binaryUpdates];
  const extensionWarnings = await checkExtensionCompatibility(
    projectRoot,
    targetToolkitVersion,
    await loadEnabledExtensions(projectRoot, workflowConfig),
  );

  if (options.dryRun === true) {
    const wouldBackup = await detectModifiedToolkitFiles(projectRoot, allUpdates);

    return {
      projectRoot,
      previousToolkitVersion,
      targetToolkitVersion,
      overwrittenFiles: allUpdates.map((update) => update.relativePath),
      backupConflicts: wouldBackup,
      mcpRefresh: [],
      dryRun: true,
      configMigrations: migrationPlan.migrations.map((migration) => migration.relativePath),
      extensionWarnings,
    };
  }

  if (
    options.yes === true &&
    migrationPlan.breakingCount > 0 &&
    options.confirmMigration !== true
  ) {
    throw new BreakingMigrationError(
      'Breaking config migrations require --confirm-migration when using --yes.',
    );
  }

  const backupConflicts = await backupModifiedToolkitFiles(projectRoot, allUpdates);

  if (options.yes !== true) {
    await promptForUpdateConfirmation({
      previousToolkitVersion,
      targetToolkitVersion,
      filesToOverwrite: allUpdates.map((update) => update.relativePath),
      backupConflicts,
      migrationCount: migrationPlan.migrations.length,
      extensionWarnings,
    });
  }

  const migrationResult = await applyUserConfigMigrations(projectRoot, migrationPlan, {
    targetToolkitVersion,
    yes: options.yes === true,
    confirmBreaking: options.yes !== true || options.confirmMigration === true,
  });

  await writeToolkitFileUpdates(projectRoot, allUpdates);
  await installProjectBinaries(projectRoot, toolkitRoot);
  await installBundledPlatformScripts(projectRoot, toolkitRoot);
  await installBundledExtensions(projectRoot, agentIds);
  await atomicWriteJson(path.join(projectRoot, '.spec-n-roll', 'compatibility.json'), {
    incompatibleCombinations: [],
  });

  const mcpRefresh = await refreshConfiguredAgentMcpConfigs(projectRoot, agentIds, async (agentId) =>
    loadBundledExtensionManifest(projectRoot, agentId),
  );

  return {
    projectRoot,
    previousToolkitVersion,
    targetToolkitVersion,
    overwrittenFiles: allUpdates.map((update) => update.relativePath),
    backupConflicts,
    mcpRefresh,
    dryRun: false,
    configMigrations: migrationResult.applied.map((migration) => migration.relativePath),
    extensionWarnings,
  };
}

/**
 * Commander action handler for `spec-n-roll update`.
 *
 * @param commandOptions - Parsed Commander options including dry-run and yes flags.
 */
export async function handleUpdateCommand(commandOptions: {
  dryRun?: boolean;
  yes?: boolean;
  confirmMigration?: boolean;
}): Promise<void> {
  try {
    const result = await runUpdate({
      projectRoot: process.cwd(),
      dryRun: commandOptions.dryRun === true,
      yes: commandOptions.yes === true,
      confirmMigration: commandOptions.confirmMigration === true,
    });

    if (result.dryRun) {
      console.log(
        `Dry run: would update toolkit ${result.previousToolkitVersion} -> ${result.targetToolkitVersion}`,
      );
      console.log(`Files: ${result.overwrittenFiles.length}`);
      console.log(`Backups: ${result.backupConflicts.length}`);
      console.log(`Config migrations: ${result.configMigrations.length}`);
      for (const warning of result.extensionWarnings) {
        console.log(`Warning: ${warning}`);
      }
      return;
    }

    console.log(
      `Updated spec-n-roll ${result.previousToolkitVersion} -> ${result.targetToolkitVersion}`,
    );
    console.log(`Overwrote ${result.overwrittenFiles.length} toolkit-owned file(s).`);
    if (result.configMigrations.length > 0) {
      console.log(`Migrated ${result.configMigrations.length} user-owned config file(s).`);
    }
    if (result.backupConflicts.length > 0) {
      console.log(
        `Backed up ${result.backupConflicts.length} locally modified toolkit-owned file(s) to .bak.`,
      );
    }
    for (const warning of result.extensionWarnings) {
      console.log(`Warning: ${warning}`);
    }
    const refreshed = result.mcpRefresh.filter((entry) => entry.refreshed).length;
    console.log(`Refreshed MCP config for ${refreshed} agent target(s).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`update failed: ${message}`);
    process.exitCode = 1;
  }
}
