import type { CytoscapeElement } from '#arch/cytoscape-element.js';

/**
 * Converts dependency-cruiser reports into Cytoscape graph elements.
 */
export class DependencyCruiserCytoscapeConverter {
  /**
   * Converts a dependency-cruiser report into Cytoscape graph elements.
   *
   * @param dependencyCruiserJson - Dependency-cruiser report serialized as JSON.
   * @returns Cytoscape node and edge elements derived from the report.
   */
  convert(dependencyCruiserJson: string): CytoscapeElement[] {
    const report = JSON.parse(dependencyCruiserJson) as {
      modules?: Array<{
        source: string;
        dependencies?: Array<{ resolved: string }>;
      }>;
    };
    const nodeIds = new Set<string>();
    const edges: CytoscapeElement[] = [];

    for (const module of report.modules ?? []) {
      nodeIds.add(module.source);

      for (const dependency of module.dependencies ?? []) {
        nodeIds.add(dependency.resolved);
        edges.push({
          data: {
            id: `${module.source}->${dependency.resolved}`,
            source: module.source,
            target: dependency.resolved,
          },
        });
      }
    }

    const nodes: CytoscapeElement[] = [...nodeIds].map((id) => ({
      data: { id, label: id },
    }));

    return nodes.concat(edges);
  }
}
