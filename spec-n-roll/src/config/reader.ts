import type { AgentConfig, ExtensionRef, WorkflowStep, WorkflowVariant } from './schema.js';

/**
 * Normalized workflow configuration parsed from any prior on-disk schema version.
 */
export interface TolerantWorkflowConfig {
  /**
   * Schema version recorded in the source document before migration.
   */
  schemaVersion: string;
  /**
   * Toolkit semver required to interpret the configuration.
   */
  toolkitVersion: string;
  /**
   * Configured agent entries.
   */
  agents: AgentConfig[];
  /**
   * Reusable workflow step registry.
   */
  steps: WorkflowStep[];
  /**
   * Named workflow tier variants.
   */
  workflows: WorkflowVariant[];
  /**
   * Default workflow variant id for manual tier selection.
   */
  defaultWorkflowId: string;
  /**
   * Optional registered extension references.
   */
  extensions?: ExtensionRef[];
  /**
   * Deprecated v1 routing block removed during breaking migration to schema v2.
   */
  legacyTierRouting?: { enabled: boolean };
}

/**
 * Normalized project metadata parsed from any prior on-disk schema version.
 */
export interface TolerantProjectMetadata {
  /**
   * Schema version recorded in the source document before migration.
   */
  schemaVersion: string;
  /**
   * Next auto-assigned task spec numeric id.
   */
  nextTaskSpecId: number;
  /**
   * Active implementation task spec id, if any.
   */
  currentTaskSpecId?: string | null;
  /**
   * Slug paired with the active task spec id, if any.
   */
  currentTaskSlug?: string | null;
  /**
   * Timestamp when implementation began for the active task, if any.
   */
  implementationStartedAt?: string | null;
  /**
   * Last metadata write timestamp.
   */
  updatedAt: string;
}

/**
 * Returns a non-empty string field from a raw config record.
 *
 * @param record - Parsed JSON object for a config file.
 * @param keys - Candidate field names in priority order.
 * @returns First present non-empty string value.
 */
function readStringField(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  throw new Error(`Missing required string field: ${keys.join(' | ')}`);
}

/**
 * Reads workflow configuration using additive-only rules for prior schema versions.
 *
 * @param raw - Untyped JSON value from disk.
 * @returns Normalized workflow configuration without unknown fields.
 */
export function readWorkflowConfigTolerant(raw: unknown): TolerantWorkflowConfig {
  if (typeof raw !== 'object' || raw == null) {
    throw new Error('Workflow config must be a JSON object.');
  }

  const record = raw as Record<string, unknown>;
  const workflows = record.workflows ?? record.workflowVariants;
  if (!Array.isArray(workflows)) {
    throw new Error('Workflow config requires a workflows or workflowVariants array.');
  }
  if (!Array.isArray(record.agents) || !Array.isArray(record.steps)) {
    throw new Error('Workflow config requires agents and steps arrays.');
  }

  const tolerant: TolerantWorkflowConfig = {
    schemaVersion: readStringField(record, ['schemaVersion']),
    toolkitVersion: readStringField(record, ['toolkitVersion', 'installedToolkitVersion']),
    agents: record.agents as AgentConfig[],
    steps: record.steps as WorkflowStep[],
    workflows: workflows as WorkflowVariant[],
    defaultWorkflowId: readStringField(record, ['defaultWorkflowId']),
    extensions: Array.isArray(record.extensions) ? (record.extensions as ExtensionRef[]) : undefined,
  };

  if (record.legacyTierRouting != null) {
    tolerant.legacyTierRouting = record.legacyTierRouting as { enabled: boolean };
  }

  return tolerant;
}

/**
 * Reads project metadata using additive-only rules for prior schema versions.
 *
 * @param raw - Untyped JSON value from disk.
 * @returns Normalized project metadata without unknown fields.
 */
export function readProjectMetadataTolerant(raw: unknown): TolerantProjectMetadata {
  if (typeof raw !== 'object' || raw == null) {
    throw new Error('Project metadata must be a JSON object.');
  }

  const record = raw as Record<string, unknown>;
  if (typeof record.nextTaskSpecId !== 'number') {
    throw new Error('Project metadata requires nextTaskSpecId.');
  }

  const currentTaskSpecId = record.currentTaskSpecId ?? record.activeTaskSpecId;
  const currentTaskSlug = record.currentTaskSlug ?? record.activeTaskSlug;

  return {
    schemaVersion: readStringField(record, ['schemaVersion']),
    nextTaskSpecId: record.nextTaskSpecId,
    currentTaskSpecId: typeof currentTaskSpecId === 'string' ? currentTaskSpecId : null,
    currentTaskSlug: typeof currentTaskSlug === 'string' ? currentTaskSlug : null,
    implementationStartedAt:
      typeof record.implementationStartedAt === 'string' ? record.implementationStartedAt : null,
    updatedAt: readStringField(record, ['updatedAt']),
  };
}
