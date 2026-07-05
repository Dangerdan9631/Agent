import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CytoscapeArtifactWriter } from '#arch/cytoscape-artifact-writer.js';
import { DependencyCruiserCytoscapeConverter } from '#arch/dependency-cruiser-cytoscape-converter.js';
import { DependencyCruiserRunner } from '#arch/dependency-cruiser-runner.js';
import type { WorkspacePackage } from '#arch/workspace-package.js';

/**
 * Generates dependency artifacts for individual workspace packages.
 */
export class PackageArchitectureArtifactGenerator {
  /**
   * Creates a package artifact generator.
   *
   * @param cruiser - Dependency-cruiser process runner.
   * @param converter - Converter from dependency-cruiser reports to graph elements.
   * @param writer - Writer for Cytoscape JSON and HTML artifacts.
   */
  constructor(
    private readonly cruiser = new DependencyCruiserRunner(),
    private readonly converter = new DependencyCruiserCytoscapeConverter(),
    private readonly writer = new CytoscapeArtifactWriter(),
  ) {}

  /**
   * Generates dependency-cruiser and Cytoscape artifacts for one package.
   *
   * @param workspaceRoot - Absolute path to the repository root.
   * @param outputRoot - Absolute path to the architecture output directory.
   * @param workspacePackage - Package metadata for the source package to inspect.
   * @returns Absolute paths to the generated package artifacts.
   */
  generate(
    workspaceRoot: string,
    outputRoot: string,
    workspacePackage: WorkspacePackage,
  ): string[] {
    const packageOutputRoot = join(outputRoot, workspacePackage.name);
    mkdirSync(packageOutputRoot, { recursive: true });
    const dependencyCruiserJsonPath = join(
      packageOutputRoot,
      'dependency-cruiser.json',
    );
    const cytoscapeJsonPath = join(packageOutputRoot, 'cytoscape.json');
    const cytoscapeHtmlPath = join(packageOutputRoot, 'cytoscape.html');

    writeFileSync(
      dependencyCruiserJsonPath,
      this.cruiser.run(workspaceRoot, workspacePackage),
    );
    const elements = this.converter.convert(
      readFileSync(dependencyCruiserJsonPath, 'utf8'),
    );
    this.writer.write(cytoscapeJsonPath, cytoscapeHtmlPath, elements);

    return [dependencyCruiserJsonPath, cytoscapeJsonPath, cytoscapeHtmlPath];
  }
}
