import type {
  AtlasArchitectureRule,
  AtlasDependencyBudgetRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Enforces direct dependency budgets at either the module or local-element boundary.
 */
export class DependencyBudgetRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates budget evaluation with shared selector matching.
   *
   * @param selectorMatcher - Matches configured module and element subjects.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Indicates whether this evaluator owns dependency budget rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the rule limits direct dependencies.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'dependency-budget';
  }

  /**
   * Reports each selected subject whose direct dependency count exceeds its budget.
   *
   * @param rule - Declared dependency budget rule.
   * @param workspace - Loaded configured model workspace.
   * @param analysisResults - Facts restricted to the owning rule boundary.
   * @returns Deterministically ordered budget violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'dependency-budget') return [];
    const budgetRule = rule as AtlasDependencyBudgetRule;
    const rootRule = 'moduleIds' in budgetRule.within || 'moduleTags' in budgetRule.within;
    const subjects = this.subjects(budgetRule, workspace, analysisResults, rootRule);
    const violations: ArchitectureViolation[] = [];
    for (const subject of subjects) {
      const relationships = this.relatedFacts(
        subject,
        rootRule,
        budgetRule.direction,
        budgetRule.relationships,
        analysisResults
      );
      const actual = this.count(budgetRule.count, subject, rootRule, relationships);
      if (actual <= budgetRule.maximum) continue;
      violations.push(
        new ArchitectureViolation(
          budgetRule.id,
          budgetRule.severity,
          subject.path,
          subject.path,
          [subject.path],
          `Reduce ${budgetRule.direction} dependencies for '${subject.path}' from ${actual} to at most ${budgetRule.maximum}.`,
          {
            actual,
            maximum: budgetRule.maximum,
            owner: rootRule ? 'root' : subject.moduleId,
            sourceModuleId: subject.moduleId,
            sourceElementId: rootRule ? undefined : subject.id
          }
        )
      );
    }
    return violations.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  }

  /**
   * Selects all valid subjects independently of whether they have any relationships.
   *
   * @param rule - Budget rule that supplies the selector.
   * @param workspace - Loaded configured model workspace.
   * @param analysisResults - Facts supplied to the evaluator.
   * @param rootRule - Determines module or element subject identity.
   * @returns Stable selected subjects.
   */
  private subjects(
    rule: AtlasDependencyBudgetRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[],
    rootRule: boolean
  ): readonly BudgetSubject[] {
    if (rootRule) {
      const modules =
        workspace.modelWorkspace === undefined ? [] : [...workspace.modelWorkspace.modules];
      return modules
        .filter(([moduleId]) => this.selectorMatcher.matches(rule.within, '', workspace, moduleId))
        .map(([moduleId]) => ({ id: moduleId, moduleId, path: `module:${moduleId}` }))
        .sort((left, right) => left.id.localeCompare(right.id));
    }
    return analysisResults.flatMap((analysis) => {
      const model = workspace.modelWorkspace?.modules.get(analysis.packageName);
      return (model?.elements ?? [])
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
        }));
    });
  }

  /**
   * Selects direct facts touching one subject in the configured direction.
   *
   * @param subject - Subject whose direct facts are counted.
   * @param rootRule - Determines module or element endpoint identity.
   * @param direction - Requested incoming, outgoing, or either direction.
   * @param analysisResults - Facts supplied to the evaluator.
   * @returns Eligible direct facts in stable analysis order.
   */
  private relatedFacts(
    subject: BudgetSubject,
    rootRule: boolean,
    direction: AtlasDependencyBudgetRule['direction'],
    relationshipKinds: readonly string[],
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly DependencyAnalysisResult['relationships'][number][] {
    return analysisResults.flatMap((analysis) =>
      analysis.relationships.filter((relationship) => {
        if (
          relationship.relationshipKind === undefined ||
          !relationshipKinds.includes(relationship.relationshipKind)
        ) {
          return false;
        }
        const source = rootRule ? relationship.sourceModuleId : relationship.sourceElementId;
        const target = rootRule ? relationship.targetModuleId : relationship.targetElementId;
        const sourceMatches = source === subject.id;
        const targetMatches = target === subject.id;
        return (
          (direction === 'outgoing' && sourceMatches) ||
          (direction === 'incoming' && targetMatches) ||
          (direction === 'either' && (sourceMatches || targetMatches))
        );
      })
    );
  }

  /**
   * Counts facts as relationships or unique opposite endpoints.
   *
   * @param unit - Configured count unit.
   * @param subject - Subject being measured.
   * @param rootRule - Determines module or element endpoint identity.
   * @param relationships - Direct facts touching the subject.
   * @returns Actual count to compare with the configured maximum.
   */
  private count(
    unit: AtlasDependencyBudgetRule['count'],
    subject: BudgetSubject,
    rootRule: boolean,
    relationships: readonly DependencyAnalysisResult['relationships'][number][]
  ): number {
    if (unit === 'relationships') return relationships.length;
    return new Set(
      relationships.map((relationship) => {
        const source = rootRule ? relationship.sourceModuleId : relationship.sourceElementId;
        const target = rootRule ? relationship.targetModuleId : relationship.targetElementId;
        return source === subject.id ? target : source;
      })
    ).size;
  }
}

/**
 * Identifies one selected root module or module-local element budget subject.
 */
interface BudgetSubject {
  /** Stable identity at the current validation boundary. */
  readonly id: string;
  /** Module owning the subject. */
  readonly moduleId: string;
  /** Portable display path for reports and diagnostics. */
  readonly path: string;
}
