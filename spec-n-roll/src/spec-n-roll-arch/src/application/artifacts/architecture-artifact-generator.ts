import { mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';
import { Logger } from 'tslog';
import type {
  ArchitectureConfig,
  ArchitectureFolderDiagramConfig,
} from '#arch/application/config/architecture-config.js';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import { ArchitectureConfigReader } from '#arch/application/config/architecture-config-reader.js';
import { ArchitectureCollapseFilter } from '#arch/application/config/architecture-collapse-filter.js';
import { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import { ArchitectureLandscapeDependencySplitter } from '#arch/application/config/architecture-landscape-dependency-splitter.js';
import { PackageArchitectureArtifactGenerator } from '#arch/application/artifacts/package-architecture-artifact-generator.js';
import { PackageFolderArchitectureArtifactGenerator } from '#arch/application/artifacts/package-folder-architecture-artifact-generator.js';
import { ProjectArchitectureArtifactGenerator } from '#arch/application/artifacts/project-architecture-artifact-generator.js';
import { RuntimePackageDiscoverer } from '#arch/application/packages/runtime-package-discoverer.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';
import { WorkspaceRootResolver } from '#arch/infrastructure/workspace/workspace-root-resolver.js';

/**
 * Orchestrates workspace architecture artifact generation.
 */
export class ArchitectureArtifactGenerator {
  /**
   * Creates an architecture artifact generator.
   *
   * @param workspaceRootResolver - Resolver for the repository root.
   * @param configReader - Reader for user-editable architecture diagram configuration.
   * @param packageDiscoverer - Discoverer for runtime workspace packages.
   * @param packageGenerator - Generator for package-level graph artifacts.
   * @param packageFolderGenerator - Generator for configured package folder graph artifacts.
   * @param projectGenerator - Generator for workspace-level graph artifacts.
   * @param logger - Logger used to report resolved configuration and generated artifacts.
   */
  constructor(
    private readonly workspaceRootResolver = new WorkspaceRootResolver(),
    private readonly configReader = new ArchitectureConfigReader(),
    private readonly packageDiscoverer = new RuntimePackageDiscoverer(),
    private readonly packageGenerator = new PackageArchitectureArtifactGenerator(),
    private readonly packageFolderGenerator = new PackageFolderArchitectureArtifactGenerator(),
    private readonly projectGenerator = new ProjectArchitectureArtifactGenerator(),
    private readonly logger = new Logger({
      name: 'spec-n-roll-arch',
      minLevel: 6,
    }),
  ) {}

  /**
   * Generates dependency-cruiser and Cytoscape artifacts for runtime packages.
   *
   * @param workspaceRoot - Optional absolute path to the repository root.
   * @returns Absolute paths to generated artifact files.
   */
  generate(workspaceRoot = this.workspaceRootResolver.resolve()): string[] {
    this.logger.debug('Resolved workspace root.', { workspaceRoot });
    const config = this.configReader.read(workspaceRoot);
    const exclusionFilter = new ArchitectureExclusionFilter(config);
    const collapseFilter = new ArchitectureCollapseFilter(config);
    const dependencySplitter = new ArchitectureLandscapeDependencySplitter(
      config,
    );
    this.logger.debug('Loaded architecture configuration.', { config });
    const packages = this.packageDiscoverer.discover(workspaceRoot);
    this.logger.debug('Discovered runtime workspace packages.', {
      packageCount: packages.length,
    });
    const outputRoot = join(
      workspaceRoot,
      'src',
      'spec-n-roll-arch',
      'architecture',
    );
    mkdirSync(outputRoot, { recursive: true });
    const folderDiagramEntries = this.folderDiagramEntries(config, packages);
    this.logger.debug('Resolved configured package folder diagrams.', {
      folderDiagramCount: folderDiagramEntries.length,
    });
    const pages = this.pages(outputRoot, packages, folderDiagramEntries);

    const packageFiles = packages.flatMap((workspacePackage) =>
      this.packageGenerator.generate(
        workspaceRoot,
        outputRoot,
        workspacePackage,
        pages,
        exclusionFilter,
        collapseFilter,
      ),
    );
    const folderFiles = folderDiagramEntries.flatMap((entry) =>
      this.packageFolderGenerator.generate(
        outputRoot,
        entry.workspacePackage,
        entry.folderDiagram,
        packages,
        pages,
        exclusionFilter.forFolderDiagram(
          entry.workspacePackage.name,
          entry.folderDiagram,
        ),
        collapseFilter.forFolderDiagram(entry.folderDiagram),
      ),
    );
    const generatedFiles = [
      ...packageFiles,
      ...folderFiles,
      ...this.projectGenerator.generate(
        outputRoot,
        packages,
        pages,
        exclusionFilter,
        dependencySplitter,
      ),
    ];

    for (const generatedFile of generatedFiles) {
      this.logger.info(chalk.green(relative(workspaceRoot, generatedFile)));
    }

    return generatedFiles;
  }

  private folderDiagramEntries(
    config: ArchitectureConfig,
    packages: WorkspacePackage[],
  ): Array<{
    workspacePackage: WorkspacePackage;
    folderDiagram: ArchitectureFolderDiagramConfig;
  }> {
    return packages.flatMap((workspacePackage) =>
      (config.folderDiagrams?.packages?.[workspacePackage.name] ?? []).map(
        (folderDiagram) => ({ workspacePackage, folderDiagram }),
      ),
    );
  }

  private pages(
    outputRoot: string,
    packages: WorkspacePackage[],
    folderDiagramEntries: Array<{
      workspacePackage: WorkspacePackage;
      folderDiagram: ArchitectureFolderDiagramConfig;
    }>,
  ): ArchitecturePage[] {
    const page = (title: string, htmlPath: string): ArchitecturePage => ({
      title,
      htmlPath,
    });
    const landscapeDiagram = join(outputRoot, 'landscape.cytoscape.html');
    const landscapeMatrix = join(outputRoot, 'landscape.matrix.html');

    return [
      {
        title: 'Landscape',
        children: [
          page('Diagram', landscapeDiagram),
          page('Dependency matrix', landscapeMatrix),
        ],
      },
      ...packages.map((workspacePackage) => {
        const packageRoot = join(outputRoot, workspacePackage.name);
        const folderEntries = folderDiagramEntries.filter(
          (entry) => entry.workspacePackage.name === workspacePackage.name,
        );
        return {
          title: workspacePackage.name,
          children: [
            page('Diagram', join(packageRoot, 'cytoscape.html')),
            page('Dependency matrix', join(packageRoot, 'matrix.html')),
            ...folderEntries.map((entry) => {
              const title =
                entry.folderDiagram.title ??
                `${workspacePackage.name} ${entry.folderDiagram.path}`;
              const slug = this.diagramSlug(entry.folderDiagram.path);
              return {
                title,
                children: [
                  page('Diagram', join(packageRoot, `${slug}.cytoscape.html`)),
                  page(
                    'Dependency matrix',
                    join(packageRoot, `${slug}.matrix.html`),
                  ),
                ],
              };
            }),
          ],
        };
      }),
    ];
  }

  private diagramSlug(folderPath: string): string {
    const normalizedPath = folderPath
      .replaceAll('\\', '/')
      .replace(/^\.\//u, '')
      .replace(/\/$/u, '');

    return `folder-${normalizedPath.replaceAll('/', '-')}`;
  }
}
