import type { AtlasElement } from '#application/federation/model/AtlasModuleModel.js';
import type { ResolvedAtlasWorkspace } from '#application/federation/model/ResolvedAtlasWorkspace.js';
import {
  DeclarationGraph,
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import type {
  DeclarationNodeKind,
  DeclarationRelationshipType
} from '#application/graph/model/DeclarationGraph.js';

/**
 * Adapts resolved language-neutral models to the compatibility declaration graph used by legacy artifacts.
 */
export class FederatedDeclarationGraphAdapter {
  /**
   * Creates a deterministic declaration graph from all selected federated modules.
   *
   * @param workspace - Loaded models with matching external identities already resolved.
   * @returns Graph containing loaded declarations and ordinary unresolved external placeholders.
   */
  public toGraph(workspace: ResolvedAtlasWorkspace): DeclarationGraph {
    const nodes = [...workspace.modules.values()]
      .flatMap((module) =>
        module.elements.map((element) =>
          this.toNode(module.module.id, element, module.sourceLanguage)
        )
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const relationships = workspace.relationships
      .map((relationship) => this.toRelationship(relationship, nodesById))
      .sort((left, right) => left.id.localeCompare(right.id));
    return new DeclarationGraph(
      [...nodesById.values()].sort((left, right) => left.id.localeCompare(right.id)),
      relationships
    );
  }

  /** Maps a portable owned declaration to a compatibility graph node. */
  private toNode(moduleId: string, element: AtlasElement, sourceLanguage: string): DeclarationNode {
    return new DeclarationNode(
      element.id,
      element.name,
      this.toKind(element.kind),
      moduleId,
      element.sourcePath,
      element.kind === 'source-unit',
      sourceLanguage
    );
  }

  /** Maps a resolved relationship and materializes unresolved target placeholders only when required. */
  private toRelationship(
    resolved: ResolvedAtlasWorkspace['relationships'][number],
    nodesById: Map<string, DeclarationNode>
  ): DeclarationRelationship {
    const sourceId = resolved.relationship.sourceElementId;
    const targetId = this.toTargetId(resolved, nodesById);
    return new DeclarationRelationship(
      resolved.relationship.id,
      sourceId,
      targetId,
      this.toRelationshipType(resolved.relationship.kind)
    );
  }

  /** Determines the compatible target node ID for internal element, internal module, or unresolved external target. */
  private toTargetId(
    resolved: ResolvedAtlasWorkspace['relationships'][number],
    nodesById: Map<string, DeclarationNode>
  ): string {
    if (resolved.targetElementId !== undefined) {
      return resolved.targetElementId;
    }
    const target = resolved.relationship.target;
    const targetId = `external:${encodeURIComponent(target.moduleId ?? target.label ?? 'unknown')}`;
    if (!nodesById.has(targetId)) {
      nodesById.set(
        targetId,
        new DeclarationNode(
          targetId,
          target.label ?? target.moduleId ?? 'unknown',
          'external',
          undefined,
          undefined,
          false
        )
      );
    }
    return targetId;
  }

  /** Maps the portable common declaration kinds supported by legacy visual artifacts. */
  private toKind(kind: AtlasElement['kind']): DeclarationNodeKind {
    if (kind === 'interface') return 'interface';
    if (kind === 'type-alias' || kind === 'delegate') return 'type-alias';
    if (kind === 'enum') return 'enum';
    if (kind === 'function') return 'function';
    if (kind === 'source-unit' || kind === 'namespace') return 'module';
    return 'class';
  }

  /** Maps portable semantic relationships to the existing renderer's relationship vocabulary. */
  private toRelationshipType(kind: string): DeclarationRelationshipType {
    return kind === 'inherits' || kind === 'implements' ? 'inheritance' : 'reference';
  }
}
