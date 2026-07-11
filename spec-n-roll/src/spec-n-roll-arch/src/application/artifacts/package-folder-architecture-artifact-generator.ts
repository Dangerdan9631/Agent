import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArchitectureCollapseFilter } from '#arch/application/config/architecture-collapse-filter.js';
import type { ArchitectureFolderDiagramConfig } from '#arch/application/config/architecture-config.js';
import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import { PackageFolderDependencyCytoscapeConverter } from '#arch/application/graph/package-folder-dependency-cytoscape-converter.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';
import { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';
import { DependencyMatrixArtifactWriter } from '#arch/infrastructure/cytoscape/dependency-matrix-artifact-writer.js';

/**
 * Generates scoped dependency artifacts for configured package folders.
 */
export class PackageFolderArchitectureArtifactGenerator {
  /**
   * Creates a package folder artifact generator.
   *
   * @param converter - Converter from dependency-cruiser reports to scoped folder graph elements.
   * @param writer - Writer for Cytoscape JSON and HTML artifacts.
   * @param matrixWriter - Writer for dependency matrix HTML artifacts.
   */
  constructor(
    private readonly converter = new PackageFolderDependencyCytoscapeConverter(),
    private readonly writer = new CytoscapeArtifactWriter(),
    private readonly matrixWriter = new DependencyMatrixArtifactWriter(),
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
   * @param collapseFilter - Folder-specific external dependency collapse filter.
   * @returns Absolute paths to the generated folder graph artifacts.
   */
  generate(
    outputRoot: string,
    workspacePackage: WorkspacePackage,
    folderDiagram: ArchitectureFolderDiagramConfig,
    packages: WorkspacePackage[] = [workspacePackage],
    pages?: ArchitecturePage[],
    exclusionFilter?: ArchitectureExclusionFilter,
    collapseFilter?: ArchitectureCollapseFilter,
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
    const matrixHtmlPath = join(
      packageOutputRoot,
      `${diagramSlug}.matrix.html`,
    );
    const elements = this.converter.convert(
      readFileSync(dependencyCruiserJsonPath, 'utf8'),
      workspacePackage,
      folderDiagram.path,
      packages,
      exclusionFilter,
      collapseFilter,
    );

    this.writer.write(cytoscapeJsonPath, cytoscapeHtmlPath, elements, pages);
    this.matrixWriter.write(matrixHtmlPath, elements, pages);

    return [cytoscapeJsonPath, cytoscapeHtmlPath, matrixHtmlPath];
  }

  private diagramSlug(folderPath: string): string {
    const normalizedPath = folderPath
      .replaceAll('\\', '/')
      .replace(/^\.\//u, '')
      .replace(/\/$/u, '');

    return `folder-${normalizedPath.replaceAll('/', '-')}`;
  }
}
