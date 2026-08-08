import type {
  AtlasArchitectureRule,
  AtlasDependencyDirectionRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';

/**
 * Enforces allow-only and forbidden dependency directions between selected sources and targets.
 */
export class DependencyDirectionRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates a direction evaluator with package/class/layer selector matching.
   *
   * @param selectorMatcher - Matches relationship endpoints against configured selectors.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Indicates whether this evaluator owns dependency-direction rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the rule restricts dependency direction.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'dependency-direction';
  }

  /**
   * Reports relationships that violate the configured allow-only or forbidden target selection.
   *
   * @param rule - Declared dependency-direction rule.
   * @param workspace - Loaded package and layer configuration.
   * @param analysisResults - Normalized dependency analysis results.
   * @returns Sorted actionable direction violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'dependency-direction') {
      return [];
    }

    const directionRule: AtlasDependencyDirectionRule = rule;
    const violations: ArchitectureViolation[] = [];

    for (const analysisResult of analysisResults) {
      for (const relationship of analysisResult.relationships) {
        if (
          relationship.targetPath === undefined ||
          !this.selectorMatcher.matches(
            directionRule.from,
            relationship.sourcePath,
            workspace,
            relationship.sourceModuleId ?? analysisResult.packageName
          )
        ) {
          continue;
        }

        const targetMatches = this.selectorMatcher.matches(
          directionRule.to,
          relationship.targetPath,
          workspace,
          relationship.targetModuleId
        );
        const violates =
          (directionRule.mode === 'allow-only' && !targetMatches) ||
          (directionRule.mode === 'forbid' && targetMatches);

        if (!violates) {
          continue;
        }

        violations.push(
          new ArchitectureViolation(
            directionRule.id,
            directionRule.severity,
            relationship.sourcePath,
            relationship.targetPath,
            [relationship.sourcePath, relationship.targetPath],
            this.describeViolation(directionRule, relationship.targetPath)
          )
        );
      }
    }

    return violations.sort((left, right) => {
      const sourceOrder = left.sourcePath.localeCompare(right.sourcePath);
      return sourceOrder === 0 ? left.targetPath.localeCompare(right.targetPath) : sourceOrder;
    });
  }

  /**
   * Creates a remediation-oriented explanation for one direction policy violation.
   *
   * @param rule - Rule whose direction constraint was violated.
   * @param targetPath - Workspace-relative dependency target path.
   * @returns Actionable violation explanation.
   */
  private describeViolation(rule: AtlasDependencyDirectionRule, targetPath: string): string {
    if (rule.mode === 'allow-only') {
      return `Route this dependency through one of rule '${rule.id}' allowed targets instead of '${targetPath}'.`;
    }

    return `Remove or invert the forbidden dependency to '${targetPath}' declared by rule '${rule.id}'.`;
  }
}
