import type {
  AtlasArchitectureRule,
  AtlasRequiredDependencyRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Requires selected modules or elements to reach a selected target through allowed facts.
 */
export class RequiredDependencyRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates reachability evaluation with shared selector matching.
   *
   * @param selectorMatcher - Matches configured module and element selectors.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Indicates whether this evaluator owns required dependency rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when a dependency path is required.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'required-dependency';
  }

  /**
   * Reports each matching source that has no positive-length qualifying path to a target.
   *
   * @param rule - Declared required dependency rule.
   * @param workspace - Loaded configured model workspace.
   * @param analysisResults - Facts restricted to the owning rule boundary.
   * @returns Deterministically ordered missing-dependency violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'required-dependency') return [];
    const dependencyRule = rule as AtlasRequiredDependencyRule;
    const rootRule = 'moduleIds' in dependencyRule.from || 'moduleTags' in dependencyRule.from;
    const sources = this.select(rootRule, dependencyRule.from, workspace, analysisResults);
    const targets = this.select(rootRule, dependencyRule.to, workspace, analysisResults);
    const targetIds = new Set(targets.map((target) => target.id));
    const adjacency = this.adjacency(rootRule, dependencyRule, analysisResults);
    return sources
      .filter((source) => !this.reaches(source.id, targetIds, adjacency, dependencyRule.path))
      .map(
        (source) =>
          new ArchitectureViolation(
            dependencyRule.id,
            dependencyRule.severity,
            source.path,
            [...targetIds].sort((left, right) => left.localeCompare(right)).join(',') ||
              'selected target',
            [source.path],
            `Add a ${dependencyRule.path} dependency from '${source.path}' to a target selected by rule '${dependencyRule.id}'.`,
            {
              owner: rootRule ? 'root' : source.moduleId,
              sourceModuleId: source.moduleId,
              sourceElementId: rootRule ? undefined : source.id
            }
          )
      )
      .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  }

  /**
   * Selects all root modules or local module elements for one selector.
   *
   * @param rootRule - Determines module or element identity.
   * @param selector - Rule source or target selector.
   * @param workspace - Loaded configured model workspace.
   * @param analysisResults - Facts supplied to the evaluator.
   * @returns Stable selected endpoint identities.
   */
  private select(
    rootRule: boolean,
    selector: AtlasRequiredDependencyRule['from'],
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly RequiredEndpoint[] {
    if (rootRule) {
      const modules =
        workspace.modelWorkspace === undefined ? [] : [...workspace.modelWorkspace.modules];
      return modules
        .filter(([moduleId]) => this.selectorMatcher.matches(selector, '', workspace, moduleId))
        .map(([moduleId]) => ({ id: moduleId, moduleId, path: `module:${moduleId}` }))
        .sort((left, right) => left.id.localeCompare(right.id));
    }
    return analysisResults.flatMap((analysis) =>
      (workspace.modelWorkspace?.modules.get(analysis.packageName)?.elements ?? [])
        .filter((element) =>
          this.selectorMatcher.matches(
            selector,
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
   * Builds a deterministic adjacency map from selected relationship kinds inside the owning graph.
   *
   * @param rootRule - Determines module or element endpoint identity.
   * @param rule - Required dependency rule supplying relationship kinds.
   * @param analysisResults - Facts supplied to the evaluator.
   * @returns Directed adjacency with duplicate targets removed.
   */
  private adjacency(
    rootRule: boolean,
    rule: AtlasRequiredDependencyRule,
    analysisResults: readonly DependencyAnalysisResult[]
  ): ReadonlyMap<string, readonly string[]> {
    const adjacency = new Map<string, Set<string>>();
    for (const analysis of analysisResults) {
      for (const relationship of analysis.relationships) {
        if (
          relationship.relationshipKind === undefined ||
          !rule.relationships.includes(relationship.relationshipKind as never)
        ) {
          continue;
        }
        const source = rootRule ? relationship.sourceModuleId : relationship.sourceElementId;
        const target = rootRule ? relationship.targetModuleId : relationship.targetElementId;
        if (source === undefined || target === undefined || source === target) continue;
        const targets = adjacency.get(source) ?? new Set<string>();
        targets.add(target);
        adjacency.set(source, targets);
      }
    }
    return new Map(
      [...adjacency].map(([source, targets]) => [
        source,
        [...targets].sort((left, right) => left.localeCompare(right))
      ])
    );
  }

  /**
   * Tests direct or transitive positive-length reachability without leaving the current graph.
   *
   * @param source - Selected source identity.
   * @param targets - Selected target identities.
   * @param adjacency - Already boundary-limited directed graph.
   * @param pathType - Direct or transitive mode.
   * @returns True when a qualifying path exists.
   */
  private reaches(
    source: string,
    targets: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, readonly string[]>,
    pathType: AtlasRequiredDependencyRule['path']
  ): boolean {
    const direct = adjacency.get(source) ?? [];
    if (direct.some((target) => targets.has(target))) return true;
    if (pathType === 'direct') return false;
    const pending = [...direct];
    const visited = new Set<string>([source]);
    while (pending.length > 0) {
      const current = pending.shift()!;
      if (targets.has(current)) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      pending.push(...(adjacency.get(current) ?? []));
    }
    return false;
  }
}

/**
 * Identifies one selected root module or module-local relationship endpoint.
 */
interface RequiredEndpoint {
  /** Stable identity at the current validation boundary. */
  readonly id: string;
  /** Module owning the endpoint. */
  readonly moduleId: string;
  /** Portable display path for reports and diagnostics. */
  readonly path: string;
}
