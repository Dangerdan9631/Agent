import type { CytoscapeElement } from '#arch/cytoscape-element.js';
import type { WorkspacePackage } from '#arch/workspace-package.js';

/**
 * Converts workspace package dependencies into Cytoscape graph elements.
 */
export class PackageDependencyCytoscapeConverter {
  /**
   * Converts workspace package dependency metadata into Cytoscape graph elements.
   *
   * @param packages - Runtime package metadata to include in the graph.
   * @returns Cytoscape node and edge elements for package dependencies.
   */
  convert(packages: WorkspacePackage[]): CytoscapeElement[] {
    const packageNames = new Set(
      packages.map((workspacePackage) => workspacePackage.name),
    );
    const nodes: CytoscapeElement[] = packages.map((workspacePackage) => ({
      data: { id: workspacePackage.name, label: workspacePackage.name },
    }));
    const edges: CytoscapeElement[] = packages.flatMap((workspacePackage) =>
      Object.keys(workspacePackage.dependencies)
        .filter((dependencyName) => packageNames.has(dependencyName))
        .map((dependencyName) => ({
          data: {
            id: `${workspacePackage.name}->${dependencyName}`,
            source: workspacePackage.name,
            target: dependencyName,
          },
        })),
    );

    return nodes.concat(edges);
  }
}
