import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';
import { PackageDependencyCytoscapeConverter } from '#arch/application/graph/package-dependency-cytoscape-converter.js';
import { PackagePublicApiExportIndex } from '#arch/application/graph/package-public-api-export-index.js';
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
   * @param pages - Generated HTML pages to show in the navigation pane.
   * @param exclusionFilter - User-configured project file exclusion filter.
   * @returns Absolute paths to the generated project graph artifacts.
   */
  generate(
    outputRoot: string,
    packages: WorkspacePackage[],
    pages?: ArchitecturePage[],
    exclusionFilter?: ArchitectureExclusionFilter,
  ): string[] {
    const packageReports = new Map(
      packages.map((workspacePackage) => [
        workspacePackage.name,
        readFileSync(
          join(outputRoot, workspacePackage.name, 'dependency-cruiser.json'),
          'utf8',
        ),
      ]),
    );
    const elements = this.converter.convert(
      packages,
      packageReports,
      exclusionFilter,
      this.sourceTexts(packages, packageReports),
      this.publicApiExportIndex(packages),
    );
    const cytoscapeJsonPath = join(
      outputRoot,
      'project-dependencies.cytoscape.json',
    );
    const cytoscapeHtmlPath = join(
      outputRoot,
      'project-dependencies.cytoscape.html',
    );

    this.writer.write(cytoscapeJsonPath, cytoscapeHtmlPath, elements, pages);

    return [cytoscapeJsonPath, cytoscapeHtmlPath];
  }

  private publicApiExportIndex(
    packages: WorkspacePackage[],
  ): PackagePublicApiExportIndex {
    return new PackagePublicApiExportIndex(
      packages.map((workspacePackage) => ({
        package: workspacePackage,
        sourceText: readFileSync(
          join(workspacePackage.root, 'src', 'index.ts'),
          'utf8',
        ),
      })),
    );
  }

  private sourceTexts(
    packages: WorkspacePackage[],
    packageReports: ReadonlyMap<string, string>,
  ): ReadonlyMap<string, string> {
    const sourceTexts = new Map<string, string>();

    for (const reportJson of packageReports.values()) {
      const report = JSON.parse(reportJson) as {
        modules?: Array<{ source: string }>;
      };

      for (const module of report.modules ?? []) {
        const sourcePackage = packages.find((workspacePackage) =>
          this.belongsToPackage(module.source, workspacePackage),
        );
        if (!sourcePackage) {
          continue;
        }

        sourceTexts.set(
          module.source,
          readFileSync(
            join(
              sourcePackage.root,
              this.packageRootRelativePath(module.source, sourcePackage),
            ),
            'utf8',
          ),
        );
      }
    }

    return sourceTexts;
  }

  private belongsToPackage(
    filePath: string,
    workspacePackage: WorkspacePackage,
  ): boolean {
    const normalizedFilePath = filePath.replaceAll('\\', '/');
    const packageRoot = this.packageRelativeRoot(workspacePackage);

    return (
      normalizedFilePath === packageRoot ||
      normalizedFilePath.startsWith(`${packageRoot}/`)
    );
  }

  private packageRootRelativePath(
    filePath: string,
    workspacePackage: WorkspacePackage,
  ): string {
    const normalizedFilePath = filePath.replaceAll('\\', '/');
    const packageRootPrefix = `${this.packageRelativeRoot(workspacePackage)}/`;

    return normalizedFilePath.startsWith(packageRootPrefix)
      ? normalizedFilePath.slice(packageRootPrefix.length)
      : normalizedFilePath;
  }

  private packageRelativeRoot(workspacePackage: WorkspacePackage): string {
    const normalizedPackageRoot = workspacePackage.root.replaceAll('\\', '/');
    const packageDirectory =
      normalizedPackageRoot.split('/').at(-1) ?? workspacePackage.name;

    return `src/${packageDirectory}`;
  }
}
