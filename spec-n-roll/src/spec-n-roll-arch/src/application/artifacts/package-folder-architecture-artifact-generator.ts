import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArchitectureFolderDiagramConfig } from '#arch/application/config/architecture-config.js';
import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import { PackageFolderDependencyCytoscapeConverter } from '#arch/application/graph/package-folder-dependency-cytoscape-converter.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';
import { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';

/**
 * Generates scoped dependency artifacts for configured package folders.
 */
export class PackageFolderArchitectureArtifactGenerator {
  /**
   * Creates a package folder artifact generator.
   *
   * @param converter - Converter from dependency-cruiser reports to scoped folder graph elements.
   * @param writer - Writer for Cytoscape JSON and HTML artifacts.
   */
  constructor(
    private readonly converter = new PackageFolderDependencyCytoscapeConverter(),
    private readonly writer = new CytoscapeArtifactWriter(),
  ) {}

  /**
   * Generates Cytoscape artifacts for one configured package folder.
   *
   * @param outputRoot - Absolute path to the architecture output directory.
   * @param workspacePackage - Package metadata for the source package to inspect.
   * @param folderDiagram - Opt-in folder diagram configuration.
   * @param packages - Runtime package metadata used to consolidate external workspace packages.
   * @param pages - Generated HTML pages to show in the navigation pane.
   * @param exclusionFilter - Folder-specific dependency and project file exclusion filter.
   * @returns Absolute paths to the generated folder graph artifacts.
   */
  generate(
    outputRoot: string,
    workspacePackage: WorkspacePackage,
    folderDiagram: ArchitectureFolderDiagramConfig,
    packages: WorkspacePackage[] = [workspacePackage],
    pages?: ArchitecturePage[],
    exclusionFilter?: ArchitectureExclusionFilter,
  ): string[] {
    const packageOutputRoot = join(outputRoot, workspacePackage.name);
    const diagramSlug = this.diagramSlug(folderDiagram.path);
    const dependencyCruiserJsonPath = join(
      packageOutputRoot,
      'dependency-cruiser.json',
    );
    const cytoscapeJsonPath = join(
      packageOutputRoot,
      `${diagramSlug}.cytoscape.json`,
    );
    const cytoscapeHtmlPath = join(
      packageOutputRoot,
      `${diagramSlug}.cytoscape.html`,
    );
    const elements = this.converter.convert(
      readFileSync(dependencyCruiserJsonPath, 'utf8'),
      workspacePackage,
      folderDiagram.path,
      packages,
      exclusionFilter,
    );

    this.writer.write(cytoscapeJsonPath, cytoscapeHtmlPath, elements, pages);

    return [cytoscapeJsonPath, cytoscapeHtmlPath];
  }

  private diagramSlug(folderPath: string): string {
    const normalizedPath = folderPath
      .replaceAll('\\', '/')
      .replace(/^\.\//u, '')
      .replace(/\/$/u, '');

    return `folder-${normalizedPath.replaceAll('/', '-')}`;
  }
}
