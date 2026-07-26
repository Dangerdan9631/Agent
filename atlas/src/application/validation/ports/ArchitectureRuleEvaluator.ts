import type { AtlasArchitectureRule } from '#application/configuration/model/AtlasConfiguration.js';
import type { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Evaluates one declared architecture policy type against normalized dependency data.
 */
export interface ArchitectureRuleEvaluator {
  /**
   * Indicates whether this evaluator owns a configured policy rule.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the evaluator can apply the rule.
   */
  supports(rule: AtlasArchitectureRule): boolean;

  /**
   * Produces deterministic actionable violations for one supported policy rule.
   *
   * @param rule - Declared policy rule owned by this evaluator.
   * @param workspace - Loaded workspace package classification state.
   * @param analysisResults - Normalized dependency analysis results.
   * @returns Violations caused by the rule, sorted by source and target identity.
   */
  evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[];
}
