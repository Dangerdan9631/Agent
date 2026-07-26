import type {
  AtlasArchitectureRule,
  AtlasCircularDependencyRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Reports each unique circular dependency relationship identified by the analysis adapter.
 */
export class CircularDependencyRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Indicates whether this evaluator owns circular-dependency rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the rule prohibits circular dependencies.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'no-circular';
  }

  /**
   * Reports one violation for each canonical circular dependency path.
   *
   * @param rule - Circular-dependency policy rule.
   * @param workspace - Unused loaded workspace state retained by the evaluator contract.
   * @param analysisResults - Normalized package dependency results.
   * @returns Deterministically sorted circular-dependency violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    _workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    const circularRule = rule as AtlasCircularDependencyRule;
    const reportedCycles = new Set<string>();
    const violations: ArchitectureViolation[] = [];

    for (const analysisResult of analysisResults) {
      for (const relationship of analysisResult.relationships) {
        if (!relationship.circular) {
          continue;
        }

        const relationshipPath = this.normalizeCyclePath(
          relationship.sourcePath,
          relationship.targetPath,
          relationship.cyclePath
        );
        const cycleKey = [...relationshipPath]
          .sort((left, right) => left.localeCompare(right))
          .join('\u0000');

        if (reportedCycles.has(cycleKey)) {
          continue;
        }
        reportedCycles.add(cycleKey);

        violations.push(
          new ArchitectureViolation(
            circularRule.id,
            circularRule.severity,
            relationship.sourcePath,
            relationship.targetPath ?? relationship.moduleSpecifier,
            relationshipPath,
            `Break the circular dependency by extracting a stable abstraction from ${relationship.sourcePath}.`
          )
        );
      }
    }

    return violations.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  }

  /**
   * Produces a non-empty cycle path when an adapter omits detailed cycle information.
   *
   * @param sourcePath - Importing source path.
   * @param targetPath - Resolved target path when known.
   * @param cyclePath - Adapter-provided cycle path.
   * @returns Ordered path suitable for violation display.
   */
  private normalizeCyclePath(
    sourcePath: string,
    targetPath: string | undefined,
    cyclePath: readonly string[]
  ): readonly string[] {
    if (cyclePath.length > 0) {
      return cyclePath;
    }

    return targetPath === undefined ? [sourcePath] : [sourcePath, targetPath];
  }
}
