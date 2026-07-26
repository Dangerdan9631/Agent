import type { AtlasConfigurationLoader } from '#application/configuration/ports/AtlasConfigurationLoader.js';
import type { AtlasLogger } from '#application/shared/logging/AtlasLogger.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { WorkspacePackageDiscoverer } from '#application/workspace/ports/WorkspacePackageDiscoverer.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
import type { WorkspacePathResolver } from '#application/workspace/ports/WorkspacePathResolver.js';

/**
 * Loads the policy, paths, and explicitly selected packages required by an Atlas command.
 */
export class WorkspaceLoader implements WorkspaceLoadingWorkflow {
  /**
   * Creates a workspace workflow from configuration, path, discovery, and logging boundaries.
   *
   * @param pathResolver - Resolves command-line workspace, configuration, and output paths.
   * @param configurationLoader - Loads the canonical user-owned configuration document.
   * @param packageDiscoverer - Discovers explicitly classified workspace packages.
   * @param logger - Records resolved workspace decisions for diagnostics.
   */
  public constructor(
    private readonly pathResolver: WorkspacePathResolver,
    private readonly configurationLoader: AtlasConfigurationLoader,
    private readonly packageDiscoverer: WorkspacePackageDiscoverer,
    private readonly logger: AtlasLogger
  ) {}

  /**
   * Loads the complete workspace state required by an Atlas command.
   *
   * @param request - Command invocation paths supplied by the presentation layer.
   * @returns Loaded workspace policy, resolved paths, and explicitly classified packages.
   */
  public async load(request: WorkspaceLoadingRequest): Promise<WorkspaceSnapshot> {
    const partialPaths = await this.pathResolver.resolveConfigurationPath(
      request.invocationDirectoryPath,
      request.workspaceOption,
      request.configurationOption
    );
    const configuration = await this.configurationLoader.load(partialPaths.configurationPath);
    const paths = await this.pathResolver.resolveArtifactRoot(
      partialPaths,
      configuration.artifacts,
      request.outputOption
    );
    const packages = await this.packageDiscoverer.discover(paths.workspaceRootPath, configuration);

    this.logger.info('Atlas loaded workspace policy and package selection.', {
      values: {
        workspaceRootPath: paths.workspaceRootPath,
        configurationPath: paths.configurationPath,
        artifactRootPath: paths.artifactRootPath,
        includedPackages: packages.map((workspacePackage) => ({
          name: workspacePackage.name,
          classification: workspacePackage.classification
        }))
      }
    });

    return new WorkspaceSnapshot(paths, configuration, packages);
  }
}
