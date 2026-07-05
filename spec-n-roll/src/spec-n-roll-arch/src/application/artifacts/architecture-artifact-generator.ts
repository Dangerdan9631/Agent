import { mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';
import { Logger } from 'tslog';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import { ArchitectureConfigReader } from '#arch/application/config/architecture-config-reader.js';
import { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import { PackageArchitectureArtifactGenerator } from '#arch/application/artifacts/package-architecture-artifact-generator.js';
import { ProjectArchitectureArtifactGenerator } from '#arch/application/artifacts/project-architecture-artifact-generator.js';
import { RuntimePackageDiscoverer } from '#arch/application/packages/runtime-package-discoverer.js';
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
   * @param projectGenerator - Generator for workspace-level graph artifacts.
   * @param logger - Logger used to report resolved configuration and generated artifacts.
   */
  constructor(
    private readonly workspaceRootResolver = new WorkspaceRootResolver(),
    private readonly configReader = new ArchitectureConfigReader(),
    private readonly packageDiscoverer = new RuntimePackageDiscoverer(),
    private readonly packageGenerator = new PackageArchitectureArtifactGenerator(),
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
    const pages: ArchitecturePage[] = [
      {
        title: 'Project dependencies',
        htmlPath: join(outputRoot, 'project-dependencies.cytoscape.html'),
      },
      ...packages.map((workspacePackage) => ({
        title: workspacePackage.name,
        htmlPath: join(outputRoot, workspacePackage.name, 'cytoscape.html'),
      })),
    ];

    const generatedFiles = [
      ...packages.flatMap((workspacePackage) =>
        this.packageGenerator.generate(
          workspaceRoot,
          outputRoot,
          workspacePackage,
          pages,
          exclusionFilter,
        ),
      ),
      ...this.projectGenerator.generate(
        outputRoot,
        packages,
        pages,
        exclusionFilter,
      ),
    ];

    for (const generatedFile of generatedFiles) {
      this.logger.info(chalk.green(relative(workspaceRoot, generatedFile)));
    }

    return generatedFiles;
  }
}
