import type {
  AtlasArchitectureRule,
  AtlasPublicApiOnlyRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Rejects selected cross-module relationships that target a non-public declaration.
 */
export class PublicApiOnlyRuleEvaluator implements ArchitectureRuleEvaluator {
  /** Stores selected public-API facts lacking a resolvable target declaration. */
  private unassessableFactCount = 0;
  /**
   * Creates public API evaluation with shared module selector matching.
   *
   * @param selectorMatcher - Matches optional source and target module selectors.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Indicates whether this evaluator owns public-api-only rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when cross-module public API boundaries are enforced.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'public-api-only';
  }

  /**
   * Reports selected facts with a resolved non-public target declaration.
   *
   * @param rule - Declared public API rule.
   * @param workspace - Loaded configured model workspace.
   * @param analysisResults - Root inter-module facts.
   * @returns Deterministically ordered visibility violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'public-api-only') return [];
    const apiRule = rule;
    const selectedRelationships = analysisResults
      .flatMap((analysis) => analysis.relationships)
      .filter(
        (relationship) =>
          relationship.sourceModuleId !== undefined &&
          relationship.targetModuleId !== undefined &&
          relationship.sourceModuleId !== relationship.targetModuleId &&
          relationship.relationshipKind !== undefined &&
          this.includesRelationshipKind(apiRule, relationship.relationshipKind) &&
          (apiRule.from === undefined ||
            this.selectorMatcher.matches(
              apiRule.from,
              '',
              workspace,
              relationship.sourceModuleId
            )) &&
          (apiRule.to === undefined ||
            this.selectorMatcher.matches(apiRule.to, '', workspace, relationship.targetModuleId))
      );
    this.unassessableFactCount = selectedRelationships.filter(
      (relationship) =>
        relationship.targetElementId === undefined ||
        workspace.modelWorkspace?.modules
          .get(relationship.targetModuleId!)
          ?.elements.some((element) => element.id === relationship.targetElementId) !== true
    ).length;
    return selectedRelationships
      .filter((relationship) => {
        if (relationship.targetElementId === undefined) return false;
        const target = workspace.modelWorkspace?.modules
          .get(relationship.targetModuleId!)
          ?.elements.find((element) => element.id === relationship.targetElementId);
        return target !== undefined && target.visibility !== 'public';
      })
      .map(
        (relationship) =>
          new ArchitectureViolation(
            apiRule.id,
            apiRule.severity,
            relationship.sourcePath,
            relationship.targetPath ?? relationship.targetElementId!,
            [relationship.sourcePath, relationship.targetPath ?? relationship.targetElementId!],
            `Depend on a public API of module '${relationship.targetModuleId}' instead of its non-public target.`,
            {
              owner: 'root',
              relationshipKind: relationship.relationshipKind,
              sourceModuleId: relationship.sourceModuleId,
              sourceElementId: relationship.sourceElementId,
              targetModuleId: relationship.targetModuleId,
              targetElementId: relationship.targetElementId
            }
          )
      )
      .sort((left, right) => {
        const sourceOrder = left.sourcePath.localeCompare(right.sourcePath);
        return sourceOrder === 0 ? left.targetPath.localeCompare(right.targetPath) : sourceOrder;
      });
  }

  /**
   * Returns selected public API facts that did not identify a loaded target declaration.
   *
   * @returns Unassessable fact count from the most recent evaluation.
   */
  public getUnassessableFactCount(): number {
    return this.unassessableFactCount;
  }

  /**
   * Matches a normalized analysis relationship kind without trusting vendor string typing.
   *
   * @param rule - Public API rule supplying allowed relationship kinds.
   * @param relationshipKind - Normalized relationship kind emitted by analysis.
   * @returns True when the rule admits the supplied relationship kind.
   */
  private includesRelationshipKind(
    rule: AtlasPublicApiOnlyRule,
    relationshipKind: string | undefined
  ): boolean {
    return (
      relationshipKind !== undefined && rule.relationships.some((kind) => kind === relationshipKind)
    );
  }
}
