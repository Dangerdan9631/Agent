import type { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Captures everything produced by one complete Atlas validation command workflow.
 */
export class ValidationCommandResult {
  /**
   * Creates the complete validation result for one loaded workspace.
   *
   * @param workspace - Loaded workspace policy and package selection.
   * @param analysisResults - Per-package normalized dependency analysis results.
   * @param validation - Deterministic policy validation outcome.
   */
  public constructor(
    public readonly workspace: WorkspaceSnapshot,
    public readonly analysisResults: readonly DependencyAnalysisResult[],
    public readonly validation: ArchitectureValidationResult
  ) {}
}
