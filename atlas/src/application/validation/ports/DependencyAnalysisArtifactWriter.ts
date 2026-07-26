import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Persists portable raw dependency analysis reports beneath the configured artifact root.
 */
export interface DependencyAnalysisArtifactWriter {
  /**
   * Writes one deterministic raw analysis report for every analysed package.
   *
   * @param workspace - Loaded workspace containing the resolved artifact root.
   * @param analysisResults - Per-package normalized results containing portable vendor reports.
   * @returns A promise that resolves after all reports have been atomically persisted.
   */
  write(
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): Promise<void>;
}
