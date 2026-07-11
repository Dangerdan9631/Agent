import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';

/**
 * Removes disconnected graph nodes while retaining the ancestors of connected nodes.
 */
export class DisconnectedCytoscapeElementPruner {
  /**
   * Removes nodes without an inbound or outbound edge after graph filtering.
   *
   * @param elements - Cytoscape nodes and edges after configured exclusions have been applied.
   * @returns Edges, their endpoint nodes, and the complete parent hierarchy of those nodes.
   */
  prune(elements: CytoscapeElement[]): CytoscapeElement[] {
    const nodesById = new Map(
      elements
        .filter((element) => !this.isEdge(element))
        .map((element) => [element.data.id, element]),
    );
    const edges = elements.filter((element) => this.isEdge(element));
    const connectedNodeIds = new Set(
      edges.flatMap((edge) => [edge.data.source, edge.data.target]),
    );

    for (const nodeId of [...connectedNodeIds]) {
      this.addAncestors(nodeId, nodesById, connectedNodeIds);
    }

    return elements.filter(
      (element) =>
        this.isEdge(element) || connectedNodeIds.has(element.data.id),
    );
  }

  private addAncestors(
    nodeId: string,
    nodesById: ReadonlyMap<string, CytoscapeElement>,
    connectedNodeIds: Set<string>,
  ): void {
    let parentId = nodesById.get(nodeId)?.data.parent;
    while (parentId && !connectedNodeIds.has(parentId)) {
      connectedNodeIds.add(parentId);
      parentId = nodesById.get(parentId)?.data.parent;
    }
  }

  private isEdge(element: CytoscapeElement): boolean {
    return Boolean(element.data.source && element.data.target);
  }
}
