import type {
  AtlasArchitectureRule,
  AtlasCircularDependencyRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';

/**
 * Reports each unique circular dependency relationship identified by the analysis adapter.
 */
export class CircularDependencyRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates cycle evaluation with optional version-two selector matching.
   *
   * @param selectorMatcher - Matches optional module or element cycle scopes.
   */
  public constructor(private readonly selectorMatcher?: RuleSelectorMatcher) {}

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
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    const circularRule = rule as AtlasCircularDependencyRule;
    const reportedCycles = new Set<string>();
    const violations: ArchitectureViolation[] = [];
    const eligibleRelationships = analysisResults.flatMap((analysisResult) =>
      analysisResult.relationships
        .filter(
          (relationship) =>
            (circularRule.relationships === undefined ||
              (relationship.relationshipKind !== undefined &&
                circularRule.relationships.some(
                  (kind) => kind === relationship.relationshipKind
                ))) &&
            this.matchesWithin(circularRule, relationship, analysisResult.packageName, workspace)
        )
        .map((relationship) => ({ analysisModuleId: analysisResult.packageName, relationship }))
    );
    const filteredAdjacency = this.toAdjacency(eligibleRelationships);

    for (const eligible of eligibleRelationships) {
      const relationship = eligible.relationship;
      const endpoints = this.endpointKeys(relationship, eligible.analysisModuleId);
      const filteredCycle =
        endpoints === undefined
          ? undefined
          : this.findPath(endpoints[1], endpoints[0], filteredAdjacency);
      if (
        circularRule.relationships === undefined
          ? !relationship.circular
          : filteredCycle === undefined
      ) {
        continue;
      }

      const relationshipPath =
        filteredCycle === undefined || endpoints === undefined
          ? this.normalizeCyclePath(
              relationship.sourcePath,
              relationship.targetPath,
              relationship.cyclePath
            )
          : [endpoints[0], ...filteredCycle.slice(0, -1)];
      const cycleKey = [...relationshipPath]
        .sort((left, right) => left.localeCompare(right))
        .join('\u0000');

      if (reportedCycles.has(cycleKey)) continue;
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

    return violations.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  }

  /** Builds deterministic adjacency from only facts admitted by the rule's kind and scope filters. */
  private toAdjacency(
    relationships: readonly FilteredCycleRelationship[]
  ): ReadonlyMap<string, readonly string[]> {
    const adjacency = new Map<string, string[]>();
    for (const candidate of relationships) {
      const endpoints = this.endpointKeys(candidate.relationship, candidate.analysisModuleId);
      if (endpoints === undefined) continue;
      const targets = adjacency.get(endpoints[0]) ?? [];
      targets.push(endpoints[1]);
      adjacency.set(endpoints[0], targets);
    }
    return new Map(
      [...adjacency].map(([source, targets]) => [
        source,
        [...new Set(targets)].sort((left, right) => left.localeCompare(right))
      ])
    );
  }

  /** Selects module endpoints for cross-module facts and declaration endpoints for local facts. */
  private endpointKeys(
    relationship: DependencyAnalysisResult['relationships'][number],
    analysisModuleId: string
  ): readonly [string, string] | undefined {
    if (
      relationship.sourceModuleId !== undefined &&
      relationship.targetModuleId !== undefined &&
      relationship.sourceModuleId !== relationship.targetModuleId
    ) {
      return [`module:${relationship.sourceModuleId}`, `module:${relationship.targetModuleId}`];
    }
    if (relationship.sourceElementId === undefined || relationship.targetElementId === undefined) {
      return undefined;
    }
    const moduleId = relationship.sourceModuleId ?? analysisModuleId;
    const targetModuleId = relationship.targetModuleId ?? moduleId;
    return [
      `${moduleId}:${relationship.sourceElementId}`,
      `${targetModuleId}:${relationship.targetElementId}`
    ];
  }

  /** Finds a deterministic directed return path within the already filtered adjacency. */
  private findPath(
    start: string,
    target: string,
    adjacency: ReadonlyMap<string, readonly string[]>
  ): readonly string[] | undefined {
    const pending: string[][] = [[start]];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const path = pending.shift()!;
      const current = path[path.length - 1]!;
      if (current === target) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) pending.push([...path, next]);
      }
    }
    return undefined;
  }

  /** Matches both endpoints of a configured module or element cycle scope. */
  private matchesWithin(
    rule: AtlasCircularDependencyRule,
    relationship: DependencyAnalysisResult['relationships'][number],
    analysisModuleId: string,
    workspace: WorkspaceSnapshot
  ): boolean {
    if (rule.within === undefined || this.selectorMatcher === undefined) return true;
    if ('moduleIds' in rule.within || 'moduleTags' in rule.within) {
      return (
        relationship.sourceModuleId !== undefined &&
        relationship.targetModuleId !== undefined &&
        this.selectorMatcher.matches(
          rule.within,
          relationship.sourcePath,
          workspace,
          relationship.sourceModuleId
        ) &&
        this.selectorMatcher.matches(
          rule.within,
          relationship.targetPath ?? `module:${relationship.targetModuleId}`,
          workspace,
          relationship.targetModuleId
        )
      );
    }
    return (
      relationship.targetPath !== undefined &&
      relationship.targetElementId !== undefined &&
      this.selectorMatcher.matches(
        rule.within,
        relationship.sourcePath,
        workspace,
        relationship.sourceModuleId ?? analysisModuleId,
        relationship.sourceElementId
      ) &&
      this.selectorMatcher.matches(
        rule.within,
        relationship.targetPath,
        workspace,
        relationship.targetModuleId ?? analysisModuleId,
        relationship.targetElementId
      )
    );
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

/**
 * Retains the owning analysis module beside one rule-filtered dependency fact.
 */
interface FilteredCycleRelationship {
  /** Module whose analysis result contains the relationship. */
  readonly analysisModuleId: string;
  /** Normalized dependency fact admitted by the rule filters. */
  readonly relationship: DependencyAnalysisResult['relationships'][number];
}
