import type { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Persists the portable validation report consumed by CLI and viewer surfaces.
 */
export interface ValidationReportWriter {
  /**
   * Writes the JSON and HTML validation report for one completed evaluation.
   *
   * @param workspace - Loaded workspace that owns the configured artifact root.
   * @param validation - Deterministic policy outcome to persist.
   * @param enforcementEnabled - Indicates whether this command exits non-zero for error violations.
   * @returns A promise that resolves after both report documents have been persisted.
   */
  write(
    workspace: WorkspaceSnapshot,
    validation: ArchitectureValidationResult,
    enforcementEnabled: boolean
  ): Promise<void>;
}
