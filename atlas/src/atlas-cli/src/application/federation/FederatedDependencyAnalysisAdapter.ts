import type { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import type { ResolvedAtlasWorkspace } from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type {
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import { DependencyRelationship } from '#application/validation/model/DependencyRelationship.js';

/**
 * Converts resolved federated model relationships into the compatibility validation dependency contract.
 */
export class FederatedDependencyAnalysisAdapter {
  /**
   * Creates analysis conversion with the shared federated graph adapter.
   *
   * @param graphAdapter - Converts owned and resolved targets into portable compatibility graph identities.
   */
  public constructor(private readonly graphAdapter: FederatedDeclarationGraphAdapter) {}

  /**
   * Produces deterministic per-module dependency analysis without interpreting source-language metadata.
   *
   * @param workspace - Resolved manifest-selected modules and relationships.
   * @returns Dependency results grouped by opaque artifact module ID.
   */
  public analyze(workspace: ResolvedAtlasWorkspace): readonly DependencyAnalysisResult[] {
    const graph = this.graphAdapter.toGraph(workspace);
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const resolvedById = new Map(
      workspace.relationships.map((relationship) => [
        this.qualify(relationship.sourceModuleId, relationship.relationship.id),
        relationship
      ])
    );
    const dependencyRelationships = graph.relationships.filter(
      (relationship) => resolvedById.get(relationship.id)?.relationship.kind !== 'contains'
    );
    const cycleDetector = new FederatedGraphCycleDetector();
    const declarationCycles = cycleDetector.detect(graph.nodes, dependencyRelationships);
    const moduleCycles = cycleDetector.detectModules(workspace.relationships);
    return [...workspace.modules.keys()]
      .sort((left, right) => left.localeCompare(right))
      .map(
        (moduleId) =>
          new DependencyAnalysisResult(
            moduleId,
            dependencyRelationships
              .filter(
                (relationship) => nodesById.get(relationship.sourceId)?.packageName === moduleId
              )
              .map((relationship) =>
                this.toRelationship(
                  relationship,
                  nodesById,
                  resolvedById,
                  declarationCycles.get(relationship.id) ?? moduleCycles.get(relationship.id)
                )
              )
              .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
            { generator: 'federated-model', moduleId }
          )
      );
  }

  /** Qualifies a module-local relationship identity using the graph adapter convention. */
  private qualify(moduleId: string, localId: string): string {
    return `${encodeURIComponent(moduleId)}:${localId}`;
  }

  /** Converts one resolved graph edge into the legacy validation relationship value. */
  private toRelationship(
    relationship: DeclarationRelationship,
    nodesById: ReadonlyMap<string, DeclarationNode>,
    resolvedById: ReadonlyMap<string, ResolvedAtlasWorkspace['relationships'][number]>,
    cyclePath: readonly string[] | undefined
  ): DependencyRelationship {
    const source = nodesById.get(relationship.sourceId);
    const target = nodesById.get(relationship.targetId);
    const resolved = resolvedById.get(relationship.id);
    const sourceModuleId = resolved?.sourceModuleId ?? source?.packageName;
    const targetModuleId = resolved?.targetModule?.module.id ?? target?.packageName;
    const sourcePath =
      source?.sourcePath ?? `module:${sourceModuleId ?? 'unknown'}/${relationship.sourceId}`;
    const targetPath =
      target?.sourcePath ??
      (targetModuleId === undefined
        ? undefined
        : `module:${targetModuleId}/${relationship.targetId}`);
    return new DependencyRelationship(
      sourcePath,
      targetPath,
      target?.packageName ?? target?.label ?? relationship.targetId,
      cyclePath !== undefined,
      cyclePath ?? [],
      sourceModuleId,
      targetModuleId,
      resolved?.relationship.kind,
      resolved?.relationship.sourceElementId,
      resolved?.targetElementId,
      resolved?.relationship.target.moduleId === undefined &&
        resolved?.relationship.target.elementId === undefined
        ? resolved?.relationship.target.label
        : undefined
    );
  }
}

/**
 * Describes the stable identities required to detect a cycle in any directed graph projection.
 */
interface DirectedCycleRelationship {
  /**
   * Stable relationship identity retained in the cycle result.
   */
  readonly id: string;

  /**
   * Directed edge source identity.
   */
  readonly sourceId: string;

  /**
   * Directed edge target identity.
   */
  readonly targetId: string;
}

/**
 * Detects deterministic directed cycles in a language-neutral declaration graph.
 */
class FederatedGraphCycleDetector {
  /**
   * Finds a return path for every relationship that participates in a directed cycle.
   *
   * @param nodes - All owned and unresolved graph nodes.
   * @param relationships - Dependency relationships eligible for architecture cycles.
   * @returns Module-qualified cycle paths keyed by stable relationship ID.
   */
  public detect(
    nodes: readonly DeclarationNode[],
    relationships: readonly DeclarationRelationship[]
  ): ReadonlyMap<string, readonly string[]> {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    return this.detectRelationships(relationships, (nodeId) =>
      this.toCyclePath(nodesById.get(nodeId), nodeId)
    );
  }

  /**
   * Finds artifact dependency cycles even when a relationship identifies only its target module.
   *
   * @param relationships - Resolved language-neutral relationships from selected manifest modules.
   * @returns Module-qualified cycle paths keyed by stable relationship ID.
   */
  public detectModules(
    relationships: ResolvedAtlasWorkspace['relationships']
  ): ReadonlyMap<string, readonly string[]> {
    const moduleRelationships = relationships.flatMap((resolved) => {
      const targetModuleId = resolved.targetModule?.module.id;
      if (
        resolved.relationship.kind === 'contains' ||
        targetModuleId === undefined ||
        targetModuleId === resolved.sourceModuleId
      ) {
        return [];
      }
      return [
        {
          id: `${encodeURIComponent(resolved.sourceModuleId)}:${resolved.relationship.id}`,
          sourceId: resolved.sourceModuleId,
          targetId: targetModuleId
        }
      ];
    });
    return this.detectRelationships(moduleRelationships, (moduleId) => `module:${moduleId}`);
  }

  /**
   * Finds deterministic return paths for one directed graph projection.
   *
   * @param relationships - Directed relationships eligible for cycle detection.
   * @param qualifyNode - Converts a graph-local node identity into a displayed cycle segment.
   * @returns Qualified cycle paths keyed by stable relationship ID.
   */
  private detectRelationships(
    relationships: readonly DirectedCycleRelationship[],
    qualifyNode: (nodeId: string) => string
  ): ReadonlyMap<string, readonly string[]> {
    const adjacency = this.toAdjacency(relationships);
    const cycles = new Map<string, readonly string[]>();
    for (const relationship of [...relationships].sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const returnPath = this.findPath(relationship.targetId, relationship.sourceId, adjacency);
      if (returnPath === undefined) continue;
      const cycleNodeIds = [relationship.sourceId, ...returnPath.slice(0, -1)];
      cycles.set(relationship.id, cycleNodeIds.map(qualifyNode));
    }
    return cycles;
  }

  /**
   * Builds a sorted adjacency index for deterministic path selection.
   *
   * @param relationships - Directed graph relationships.
   * @returns Sorted target node IDs keyed by source node ID.
   */
  private toAdjacency(
    relationships: readonly DirectedCycleRelationship[]
  ): ReadonlyMap<string, readonly string[]> {
    const adjacency = new Map<string, string[]>();
    for (const relationship of relationships) {
      const targets = adjacency.get(relationship.sourceId) ?? [];
      targets.push(relationship.targetId);
      adjacency.set(relationship.sourceId, targets);
    }
    return new Map(
      [...adjacency].map(([sourceId, targets]) => [
        sourceId,
        [...new Set(targets)].sort((left, right) => left.localeCompare(right))
      ])
    );
  }

  /**
   * Finds the shortest deterministic directed path between two node IDs.
   *
   * @param startId - First node in the requested return path.
   * @param targetId - Node that completes the cycle.
   * @param adjacency - Sorted directed adjacency index.
   * @returns Inclusive node path, or undefined when the target is unreachable.
   */
  private findPath(
    startId: string,
    targetId: string,
    adjacency: ReadonlyMap<string, readonly string[]>
  ): readonly string[] | undefined {
    const pending: string[][] = [[startId]];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const path = pending.shift()!;
      const currentId = path[path.length - 1]!;
      if (currentId === targetId) return path;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      for (const target of adjacency.get(currentId) ?? []) {
        if (!visited.has(target)) pending.push([...path, target]);
      }
    }
    return undefined;
  }

  /**
   * Qualifies module-local paths so equal source paths from different modules remain distinct.
   *
   * @param node - Resolved declaration node when present.
   * @param fallbackId - Stable graph identity used when a node is unavailable.
   * @returns Deterministic cycle path segment.
   */
  private toCyclePath(node: DeclarationNode | undefined, fallbackId: string): string {
    if (node === undefined) return fallbackId;
    const localPath = node.sourcePath ?? node.id;
    return node.packageName === undefined ? localPath : `${node.packageName}:${localPath}`;
  }
}
