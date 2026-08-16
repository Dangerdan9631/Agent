import type {
  AtlasArchitectureRule,
  AtlasNoOrphansRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Reports selected modules or elements that have no direct relationship in a requested direction.
 */
export class NoOrphansRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates orphan evaluation with shared selector matching.
   *
   * @param selectorMatcher - Matches configured module and element selectors.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Indicates whether this evaluator owns no-orphans rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the rule detects orphaned subjects.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'no-orphans';
  }

  /**
   * Reports every selected subject with no direct fact in the requested direction.
   *
   * @param rule - Declared no-orphans rule.
   * @param workspace - Loaded configured model workspace.
   * @param analysisResults - Facts restricted to the owning rule boundary.
   * @returns Deterministically ordered orphan violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'no-orphans') return [];
    const orphanRule = rule as AtlasNoOrphansRule;
    const rootRule = 'moduleIds' in orphanRule.within || 'moduleTags' in orphanRule.within;
    return this.subjects(orphanRule, rootRule, workspace, analysisResults)
      .filter(
        (subject) =>
          !analysisResults.some((analysis) =>
            analysis.relationships.some((relationship) =>
              this.matchesRelationship(
                subject,
                rootRule,
                orphanRule.direction,
                orphanRule.relationships,
                relationship
              )
            )
          )
      )
      .map(
        (subject) =>
          new ArchitectureViolation(
            orphanRule.id,
            orphanRule.severity,
            subject.path,
            subject.path,
            [subject.path],
            `Add a direct ${orphanRule.direction} relationship for '${subject.path}' required by rule '${orphanRule.id}'.`,
            {
              owner: rootRule ? 'root' : subject.moduleId,
              sourceModuleId: subject.moduleId,
              sourceElementId: rootRule ? undefined : subject.id
            }
          )
      )
      .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  }

  /**
   * Selects all root modules or local elements, including subjects with no analysis facts.
   *
   * @param rule - No-orphans rule supplying the selector.
   * @param rootRule - Determines module or element identity.
   * @param workspace - Loaded configured model workspace.
   * @param analysisResults - Facts supplied to the evaluator.
   * @returns Stable selected subject identities.
   */
  private subjects(
    rule: AtlasNoOrphansRule,
    rootRule: boolean,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly OrphanSubject[] {
    if (rootRule) {
      const modules =
        workspace.modelWorkspace === undefined ? [] : [...workspace.modelWorkspace.modules];
      return modules
        .filter(([moduleId]) => this.selectorMatcher.matches(rule.within, '', workspace, moduleId))
        .map(([moduleId]) => ({ id: moduleId, moduleId, path: `module:${moduleId}` }))
        .sort((left, right) => left.id.localeCompare(right.id));
    }
    return analysisResults.flatMap((analysis) =>
      (workspace.modelWorkspace?.modules.get(analysis.packageName)?.elements ?? [])
        .filter((element) =>
          this.selectorMatcher.matches(
            rule.within,
            element.sourcePath ?? element.id,
            workspace,
            analysis.packageName,
            element.id
          )
        )
        .map((element) => ({
          id: element.id,
          moduleId: analysis.packageName,
          path: element.sourcePath ?? element.id
        }))
    );
  }

  /**
   * Determines whether one fact connects a selected subject in the configured direction.
   *
   * @param subject - Selected module or element subject.
   * @param rootRule - Determines module or element endpoint identity.
   * @param direction - Requested relationship direction.
   * @param relationshipKinds - Configured relationship kind filter.
   * @param relationship - Candidate direct fact.
   * @returns True when the fact prevents the subject from being orphaned.
   */
  private matchesRelationship(
    subject: OrphanSubject,
    rootRule: boolean,
    direction: AtlasNoOrphansRule['direction'],
    relationshipKinds: readonly string[],
    relationship: DependencyAnalysisResult['relationships'][number]
  ): boolean {
    if (
      relationship.relationshipKind === undefined ||
      !relationshipKinds.includes(relationship.relationshipKind)
    ) {
      return false;
    }
    const source = rootRule ? relationship.sourceModuleId : relationship.sourceElementId;
    const target = rootRule ? relationship.targetModuleId : relationship.targetElementId;
    return (
      (direction === 'outgoing' && source === subject.id) ||
      (direction === 'incoming' && target === subject.id) ||
      (direction === 'either' && (source === subject.id || target === subject.id))
    );
  }
}

/**
 * Identifies one selected root module or module-local element orphan subject.
 */
interface OrphanSubject {
  /** Stable identity at the current validation boundary. */
  readonly id: string;
  /** Module owning the subject. */
  readonly moduleId: string;
  /** Portable display path for reports and diagnostics. */
  readonly path: string;
}
