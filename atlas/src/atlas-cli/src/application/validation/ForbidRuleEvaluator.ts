import type {
  AtlasArchitectureRule,
  AtlasElementSelector,
  AtlasExternalTargetSelector,
  AtlasForbidRule,
  AtlasModuleSelector
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Enforces module-owned general prohibitions against local, loaded-module, or external targets.
 */
export class ForbidRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates target prohibition behavior from the shared selector matcher.
   *
   * @param selectorMatcher - Matches module and source-path selector fields.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Identifies the version-two general forbid rule.
   *
   * @param rule - Configured architecture rule.
   * @returns True when the rule prohibits selected targets.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'forbid';
  }

  /**
   * Reports relationships whose source and target match the configured prohibition.
   *
   * @param rule - Configured architecture rule.
   * @param workspace - Loaded configuration and module metadata.
   * @param analysisResults - Facts already restricted to the owning module.
   * @returns Deterministically ordered violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'forbid') return [];
    const forbidRule: AtlasForbidRule = rule;
    return analysisResults
      .flatMap((analysis) =>
        analysis.relationships
          .filter(
            (relationship) =>
              (relationship.relationshipKind === undefined ||
                forbidRule.relationships.some((kind) => kind === relationship.relationshipKind)) &&
              (forbidRule.from === undefined ||
                this.selectorMatcher.matches(
                  forbidRule.from,
                  relationship.sourcePath,
                  workspace,
                  relationship.sourceModuleId ?? analysis.packageName,
                  relationship.sourceElementId
                )) &&
              this.matchesTarget(forbidRule, relationship, workspace)
          )
          .map(
            (relationship) =>
              new ArchitectureViolation(
                forbidRule.id,
                forbidRule.severity,
                relationship.sourcePath,
                relationship.targetPath ?? relationship.moduleSpecifier,
                [relationship.sourcePath, relationship.targetPath ?? relationship.moduleSpecifier],
                `Remove the dependency forbidden by rule '${forbidRule.id}'.`
              )
          )
      )
      .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  }

  /** Matches exactly the target selector family selected by the closed rule schema. */
  private matchesTarget(
    rule: AtlasForbidRule,
    relationship: DependencyAnalysisResult['relationships'][number],
    workspace: WorkspaceSnapshot
  ): boolean {
    const external = rule.to as AtlasExternalTargetSelector;
    if (external.externalIds !== undefined) {
      return (
        relationship.targetModuleId === undefined &&
        external.externalIds.some((pattern) =>
          this.matchesId(relationship.externalTargetId ?? relationship.moduleSpecifier, pattern)
        )
      );
    }
    const module = rule.to as AtlasModuleSelector;
    if (module.moduleIds !== undefined || module.moduleTags !== undefined) {
      return (
        relationship.targetModuleId !== undefined &&
        this.selectorMatcher.matches(
          module,
          relationship.targetPath ?? `module:${relationship.targetModuleId}`,
          workspace,
          relationship.targetModuleId
        )
      );
    }
    return (
      relationship.targetPath !== undefined &&
      relationship.targetModuleId === relationship.sourceModuleId &&
      this.selectorMatcher.matches(
        rule.to as AtlasElementSelector,
        relationship.targetPath,
        workspace,
        relationship.targetModuleId,
        relationship.targetElementId
      )
    );
  }

  /** Matches the complete opaque ID pattern grammar. */
  private matchesId(value: string, pattern: string): boolean {
    const expression = pattern
      .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('\\*', '.*')
      .replaceAll('\\?', '.');
    return new RegExp(`^${expression}$`, 'u').test(value);
  }
}
