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
    return [...workspace.modules.keys()]
      .sort((left, right) => left.localeCompare(right))
      .map(
        (moduleId) =>
          new DependencyAnalysisResult(
            moduleId,
            graph.relationships
              .filter(
                (relationship) => nodesById.get(relationship.sourceId)?.packageName === moduleId
              )
              .map((relationship) => this.toRelationship(relationship, nodesById))
              .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
            { generator: 'federated-model', moduleId }
          )
      );
  }

  /** Converts one resolved graph edge into the legacy validation relationship value. */
  private toRelationship(
    relationship: DeclarationRelationship,
    nodesById: ReadonlyMap<string, DeclarationNode>
  ): DependencyRelationship {
    const source = nodesById.get(relationship.sourceId);
    const target = nodesById.get(relationship.targetId);
    const sourcePath =
      source?.sourcePath ?? `module:${source?.packageName ?? 'unknown'}/${relationship.sourceId}`;
    const targetPath = target?.sourcePath;
    return new DependencyRelationship(
      sourcePath,
      targetPath,
      target?.packageName ?? target?.label ?? relationship.targetId,
      false,
      []
    );
  }
}
