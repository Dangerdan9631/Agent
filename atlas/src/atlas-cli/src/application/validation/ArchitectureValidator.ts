import type { AtlasArchitectureRule } from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
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
    const legacyRules = (workspace.configuration as unknown as LegacyRuleConfiguration).rules;
    const rootRules = workspace.configuration.validation?.rules ?? legacyRules ?? [];
    const rootAnalysis =
      workspace.configuration.documentType === 'root'
        ? this.toInterModuleAnalysis(analysisResults)
        : analysisResults;
    const moduleRules = [...workspace.moduleConfigurationsById].flatMap(([moduleId, module]) =>
      (module.validation?.rules ?? []).map((rule) => ({ moduleId, rule }))
    );
    const rootViolations = rootRules.flatMap((rule) =>
      this.evaluateRule(rule, workspace, rootAnalysis)
    );
    const moduleViolations = moduleRules.flatMap(({ moduleId, rule }) =>
      this.evaluateRule(
        rule,
        workspace,
        analysisResults.filter((analysis) => analysis.packageName === moduleId)
      ).map((violation) => Object.assign(violation, { ruleId: `${moduleId}:${violation.ruleId}` }))
    );
    const violations = [...rootViolations, ...moduleViolations];

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

  /** Restricts root validation facts to relationships crossing loaded module boundaries. */
  private toInterModuleAnalysis(
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly DependencyAnalysisResult[] {
    return analysisResults.map(
      (analysis) =>
        new DependencyAnalysisResult(
          analysis.packageName,
          analysis.relationships.filter(
            (relationship) =>
              relationship.sourceModuleId !== undefined &&
              relationship.targetModuleId !== undefined &&
              relationship.sourceModuleId !== relationship.targetModuleId
          ),
          analysis.rawReport
        )
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

/**
 * Describes the obsolete root rule collection accepted only by direct legacy test fixtures.
 */
interface LegacyRuleConfiguration {
  /** Lists legacy root validation rules. */
  readonly rules?: readonly AtlasArchitectureRule[];
}
