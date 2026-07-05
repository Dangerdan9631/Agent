import { join } from 'node:path';
import { CytoscapeArtifactWriter } from '#arch/cytoscape-artifact-writer.js';
import { PackageDependencyCytoscapeConverter } from '#arch/package-dependency-cytoscape-converter.js';
import type { WorkspacePackage } from '#arch/workspace-package.js';

/**
 * Generates project-level workspace dependency artifacts.
 */
export class ProjectArchitectureArtifactGenerator {
  /**
   * Creates a project artifact generator.
   *
   * @param converter - Converter from workspace package metadata to graph elements.
   * @param writer - Writer for Cytoscape JSON and HTML artifacts.
   */
  constructor(
    private readonly converter = new PackageDependencyCytoscapeConverter(),
    private readonly writer = new CytoscapeArtifactWriter(),
  ) {}

  /**
   * Generates Cytoscape artifacts that describe workspace package relationships.
   *
   * @param outputRoot - Absolute path to the architecture output directory.
   * @param packages - Runtime package metadata to include in the graph.
   * @returns Absolute paths to the generated project graph artifacts.
   */
  generate(outputRoot: string, packages: WorkspacePackage[]): string[] {
    const elements = this.converter.convert(packages);
    const cytoscapeJsonPath = join(
      outputRoot,
      'project-dependencies.cytoscape.json',
    );
    const cytoscapeHtmlPath = join(
      outputRoot,
      'project-dependencies.cytoscape.html',
    );

    this.writer.write(cytoscapeJsonPath, cytoscapeHtmlPath, elements);

    return [cytoscapeJsonPath, cytoscapeHtmlPath];
  }
}
