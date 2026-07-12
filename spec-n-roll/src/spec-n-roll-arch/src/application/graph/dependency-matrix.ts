import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';

/**
 * Describes computed complexity measurements for a dependency graph.
 */
export interface DependencyGraphMetrics {
  /**
   * Count of file nodes included in the matrix. External and grouping nodes are excluded.
   */
  fileCount: number;

  /**
   * Count of directed dependencies between included file nodes.
   */
  dependencyCount: number;

  /**
   * Ratio of present dependencies to possible directed dependencies between distinct files.
   */
  density: number;

  /**
   * Mean outbound dependency count across included files.
   */
  averageOutboundDependencies: number;

  /**
   * Highest outbound dependency count found on one included file.
   */
  maximumOutboundDependencies: number;

  /**
   * Highest inbound dependency count found on one included file.
   */
  maximumInboundDependencies: number;

  /**
   * Count of included files with no inbound or outbound dependencies.
   */
  isolatedFileCount: number;

  /**
   * Count of strongly connected components that contain more than one file.
   */
  cycleGroupCount: number;
}

/**
 * Describes one directed file dependency in a dependency matrix.
 */
export interface DependencyMatrixEdge {
  /**
   * Source file path for the dependency. The value matches a row path in the matrix.
   */
  source: string;

  /**
   * Target file path for the dependency. The value matches a column path in the matrix.
   */
  target: string;

  /** Semantic relationship represented by this matrix edge. */
  relationshipType: 'reference' | 'inheritance';
}

/**
 * Represents a file dependency matrix and the metrics derived from its graph.
 */
export class DependencyMatrix {
  /**
   * Creates a dependency matrix from Cytoscape graph elements.
   *
   * @param files - File paths included as matrix rows and columns.
   * @param edges - Directed dependencies between included files.
   * @param metrics - Complexity measurements computed from the included graph.
   */
  private constructor(
    public readonly files: string[],
    public readonly edges: DependencyMatrixEdge[],
    public readonly metrics: DependencyGraphMetrics,
  ) {}

  /**
   * Builds a file-only dependency matrix from Cytoscape elements.
   *
   * @param elements - Cytoscape nodes and edges from a generated dependency graph.
   * @returns Matrix containing alphabetically sorted file paths, file-to-file edges, and graph metrics.
   */
  static fromElements(elements: CytoscapeElement[]): DependencyMatrix {
    const fileIds = new Set(
      elements
        .filter((element) => this.isFileNode(element))
        .map((element) => element.data.id),
    );
    const files = [...fileIds].sort((left, right) => left.localeCompare(right));
    const edges = elements
      .filter((element) => this.isFileEdge(element, fileIds))
      .map((element) => ({
        source: element.data.source,
        target: element.data.target,
        relationshipType:
          element.data.relationshipType === 'inheritance'
            ? 'inheritance'
            : 'reference',
      }))
      .sort((left, right) =>
        left.source === right.source
          ? left.target.localeCompare(right.target)
          : left.source.localeCompare(right.source),
      );

    return new DependencyMatrix(files, edges, this.metrics(files, edges));
  }

  /**
   * Checks whether a dependency exists from a source file to a target file.
   *
   * @param source - Source file path from a matrix row.
   * @param target - Target file path from a matrix column.
   * @returns true when the matrix contains the directed dependency.
   */
  hasDependency(source: string, target: string): boolean {
    return this.edges.some(
      (edge) => edge.source === source && edge.target === target,
    );
  }

  /**
   * Returns all relationship kinds between two matrix nodes.
   *
   * @param source - Source declaration node id.
   * @param target - Target declaration node id.
   * @returns Relationship kinds in stable display order.
   */
  relationshipTypes(source: string, target: string): Array<'reference' | 'inheritance'> {
    return [...new Set(this.edges.filter((edge) => edge.source === source && edge.target === target).map((edge) => edge.relationshipType))].sort();
  }

  private static isFileNode(element: CytoscapeElement): boolean {
    return (
      Boolean(element.data.id) &&
      !element.data.source &&
      (Boolean(element.data.nodeKind) || this.isFilePath(element.data.id))
    );
  }

  private static isFileEdge(
    element: CytoscapeElement,
    fileIds: ReadonlySet<string>,
  ): boolean {
    return (
      Boolean(element.data.source) &&
      Boolean(element.data.target) &&
      fileIds.has(element.data.source) &&
      fileIds.has(element.data.target)
    );
  }

  private static isFilePath(value: string): boolean {
    return !value.startsWith('directory:') && !value.startsWith('folder:') && value.includes('/');
  }


  private static metrics(
    files: string[],
    edges: DependencyMatrixEdge[],
  ): DependencyGraphMetrics {
    const outboundCounts = new Map(files.map((file) => [file, 0]));
    const inboundCounts = new Map(files.map((file) => [file, 0]));

    for (const edge of edges) {
      outboundCounts.set(
        edge.source,
        (outboundCounts.get(edge.source) ?? 0) + 1,
      );
      inboundCounts.set(edge.target, (inboundCounts.get(edge.target) ?? 0) + 1);
    }

    const uniquePairs = new Set(edges.map((edge) => `${edge.source}->${edge.target}`));
    const possibleDependencies = files.length * Math.max(files.length - 1, 0);

    return {
      fileCount: files.length,
      dependencyCount: edges.length,
      density:
        possibleDependencies === 0 ? 0 : uniquePairs.size / possibleDependencies,
      averageOutboundDependencies:
        files.length === 0 ? 0 : edges.length / files.length,
      maximumOutboundDependencies: Math.max(0, ...outboundCounts.values()),
      maximumInboundDependencies: Math.max(0, ...inboundCounts.values()),
      isolatedFileCount: files.filter(
        (file) =>
          (outboundCounts.get(file) ?? 0) === 0 &&
          (inboundCounts.get(file) ?? 0) === 0,
      ).length,
      cycleGroupCount: this.cycleGroupCount(files, edges),
    };
  }

  private static cycleGroupCount(
    files: string[],
    edges: DependencyMatrixEdge[],
  ): number {
    const adjacency = new Map(files.map((file) => [file, [] as string[]]));
    for (const edge of edges) {
      adjacency.get(edge.source)?.push(edge.target);
    }

    const indexes = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    const stack: string[] = [];
    const stacked = new Set<string>();
    let nextIndex = 0;
    let cycleGroupCount = 0;

    const visit = (file: string): void => {
      indexes.set(file, nextIndex);
      lowLinks.set(file, nextIndex);
      nextIndex += 1;
      stack.push(file);
      stacked.add(file);

      for (const dependency of adjacency.get(file) ?? []) {
        if (!indexes.has(dependency)) {
          visit(dependency);
          lowLinks.set(
            file,
            Math.min(lowLinks.get(file) ?? 0, lowLinks.get(dependency) ?? 0),
          );
        } else if (stacked.has(dependency)) {
          lowLinks.set(
            file,
            Math.min(lowLinks.get(file) ?? 0, indexes.get(dependency) ?? 0),
          );
        }
      }

      if (lowLinks.get(file) !== indexes.get(file)) {
        return;
      }

      let componentSize = 0;
      let current: string | undefined;
      do {
        current = stack.pop();
        if (current) {
          stacked.delete(current);
          componentSize += 1;
        }
      } while (current && current !== file);

      if (componentSize > 1) {
        cycleGroupCount += 1;
      }
    };

    for (const file of files) {
      if (!indexes.has(file)) {
        visit(file);
      }
    }

    return cycleGroupCount;
  }
}
