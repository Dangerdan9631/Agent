import { join } from 'node:path';
import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { ArchitectureLandscapeDependencySplitter } from '#arch/application/config/architecture-landscape-dependency-splitter.js';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';
import { DependencyMatrixArtifactWriter } from '#arch/infrastructure/cytoscape/dependency-matrix-artifact-writer.js';
import type { ArchitectureTypeGraph } from '#arch/application/graph/architecture-type-graph.js';
import { ArchitectureTypeCytoscapeConverter } from '#arch/application/graph/architecture-type-cytoscape-converter.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Generates project-level workspace dependency artifacts.
 */
export class ProjectArchitectureArtifactGenerator {
  /**
   * Creates a project artifact generator.
   *
   * @param converter - Converter from workspace package metadata to graph elements.
   * @param writer - Writer for Cytoscape JSON and HTML artifacts.
   * @param matrixWriter - Writer for dependency matrix HTML artifacts.
   */
  constructor(
    private readonly converter = new ArchitectureTypeCytoscapeConverter(),
    private readonly writer = new CytoscapeArtifactWriter(),
    private readonly matrixWriter = new DependencyMatrixArtifactWriter(),
  ) {}

  /**
   * Generates Cytoscape artifacts that describe workspace package relationships.
   *
   * @param outputRoot - Absolute path to the architecture output directory.
   * @param packages - Runtime package metadata to include in the graph.
   * @param pages - Generated HTML pages to show in the navigation pane.
   * @param exclusionFilter - User-configured project file exclusion filter.
   * @param dependencySplitter - User-configured landscape external dependency node splitter.
   * @returns Absolute paths to the generated project graph artifacts.
   */
  generate(
    outputRoot: string,
    packages: WorkspacePackage[],
    typeGraph: ArchitectureTypeGraph,
    pages?: ArchitecturePage[],
    exclusionFilter?: ArchitectureExclusionFilter,
    dependencySplitter?: ArchitectureLandscapeDependencySplitter,
  ): string[] {
    const elements = this.converter.landscapeElements(
      typeGraph,
      packages,
      exclusionFilter,
      dependencySplitter,
    );
    const cytoscapeJsonPath = join(outputRoot, 'landscape.cytoscape.json');
    const cytoscapeHtmlPath = join(outputRoot, 'landscape.cytoscape.html');
    const matrixHtmlPath = join(outputRoot, 'landscape.matrix.html');

    this.writer.write(cytoscapeJsonPath, cytoscapeHtmlPath, elements, pages);
    this.matrixWriter.write(matrixHtmlPath, elements, pages);

    return [cytoscapeJsonPath, cytoscapeHtmlPath, matrixHtmlPath];
  }
}
