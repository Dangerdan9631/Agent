import type { AtlasArchitectureRule } from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Applies every declared architecture rule through focused evaluator implementations.
 */
export class ArchitectureValidator {
  /**
   * Creates a validation service with all supported rule evaluators.
   *
   * @param evaluators - Independent evaluators for declared rule types.
   */
  public constructor(private readonly evaluators: readonly ArchitectureRuleEvaluator[]) {}

  /**
   * Evaluates every declared policy rule against normalized workspace dependencies.
   *
   * @param workspace - Loaded workspace policy and package classification state.
   * @param analysisResults - Dependency analysis results grouped by package.
   * @returns Sorted validation result containing actionable violations.
   */
  public validate(
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): ArchitectureValidationResult {
    const violations = (workspace.configuration.rules ?? []).flatMap((rule) =>
      this.evaluateRule(rule, workspace, analysisResults)
    );

    return new ArchitectureValidationResult(
      violations.sort((left, right) => {
        const ruleOrder = left.ruleId.localeCompare(right.ruleId);
        if (ruleOrder !== 0) {
          return ruleOrder;
        }
        const sourceOrder = left.sourcePath.localeCompare(right.sourcePath);
        if (sourceOrder !== 0) {
          return sourceOrder;
        }
        const targetOrder = left.targetPath.localeCompare(right.targetPath);
        if (targetOrder !== 0) {
          return targetOrder;
        }
        return left.message.localeCompare(right.message);
      })
    );
  }

  /**
   * Delegates one declared rule to exactly one supporting evaluator.
   *
   * @param rule - Declared architecture policy rule.
   * @param workspace - Loaded workspace policy and package state.
   * @param analysisResults - Normalized dependency analysis results.
   * @returns Violations reported by the owning evaluator.
   */
  private evaluateRule(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ) {
    const evaluator = this.evaluators.find((candidate) => candidate.supports(rule));

    if (evaluator === undefined) {
      throw new Error(`No Atlas rule evaluator supports configured rule '${rule.type}'.`);
    }

    return evaluator.evaluate(rule, workspace, analysisResults);
  }
}
