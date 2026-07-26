import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Produces normalized dependency relationships and raw portable reports for a loaded workspace.
 */
export interface DependencyAnalyzer {
  /**
   * Analyses every explicitly selected workspace package.
   *
   * @param workspace - Fully loaded workspace policy and package selection.
   * @returns Per-package analysis results sorted by package name.
   */
  analyze(workspace: WorkspaceSnapshot): Promise<readonly DependencyAnalysisResult[]>;
}
