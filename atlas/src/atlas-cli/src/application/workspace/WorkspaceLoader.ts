import type {
  AtlasArtifactConfiguration,
  AtlasConfiguration,
  AtlasModuleConfiguration
} from '#application/configuration/model/AtlasConfiguration.js';
import type { AtlasConfigurationLoader } from '#application/configuration/ports/AtlasConfigurationLoader.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import type { AtlasLogger } from '#application/shared/logging/AtlasLogger.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { WorkspacePackageDiscoverer } from '#application/workspace/ports/WorkspacePackageDiscoverer.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
import type { ManifestWorkspacePackageResolver } from '#application/workspace/ports/ManifestWorkspacePackageResolver.js';
import type { WorkspacePathResolver } from '#application/workspace/ports/WorkspacePathResolver.js';
import { dirname } from 'node:path';

/**
 * Loads composed project policy and only the generated models selected by its ordered module list.
 */
export class WorkspaceLoader implements WorkspaceLoadingWorkflow {
  private readonly modelLoader: AtlasWorkspaceLoader | undefined;
  private readonly packageDiscoverer: WorkspacePackageDiscoverer | undefined;
  private readonly manifestPackageResolver: ManifestWorkspacePackageResolver | undefined;
  private readonly logger: AtlasLogger;

  /**
   * Creates the canonical version-two workspace loader.
   *
   * @param pathResolver - Resolves command-line project, configuration, and output paths.
   * @param configurationLoader - Loads and composes the canonical root configuration.
   * @param modelLoader - Loads generated models selected by composed module entries.
   * @param logger - Records resolved configuration and partial-project decisions.
   */
  public constructor(
    pathResolver: WorkspacePathResolver,
    configurationLoader: AtlasConfigurationLoader,
    modelLoader: AtlasWorkspaceLoader,
    logger: AtlasLogger
  );

  /**
   * Creates the temporary version-one compatibility composition used by legacy callers.
   *
   * @param pathResolver - Resolves command-line workspace paths.
   * @param configurationLoader - Loads configuration policy.
   * @param packageDiscoverer - Discovers legacy source packages.
   * @param manifestPackageResolver - Resolves legacy manifest-selected packages.
   * @param logger - Records workspace decisions.
   */
  public constructor(
    pathResolver: WorkspacePathResolver,
    configurationLoader: AtlasConfigurationLoader,
    packageDiscoverer: WorkspacePackageDiscoverer,
    manifestPackageResolver: ManifestWorkspacePackageResolver,
    logger: AtlasLogger
  );

  /**
   * Wires either the canonical model-loading boundary or the isolated legacy compatibility boundary.
   *
   * @param pathResolver - Resolves configuration and artifact paths.
   * @param configurationLoader - Loads configuration policy.
   * @param modelOrPackageLoader - Canonical model loader or legacy package discoverer.
   * @param loggerOrManifestResolver - Canonical logger or legacy manifest resolver.
   * @param legacyLogger - Logger supplied only by the legacy constructor form.
   */
  public constructor(
    private readonly pathResolver: WorkspacePathResolver,
    private readonly configurationLoader: AtlasConfigurationLoader,
    modelOrPackageLoader: AtlasWorkspaceLoader | WorkspacePackageDiscoverer,
    loggerOrManifestResolver: AtlasLogger | ManifestWorkspacePackageResolver,
    legacyLogger?: AtlasLogger
  ) {
    if (this.isModelLoader(modelOrPackageLoader)) {
      this.modelLoader = modelOrPackageLoader;
      this.packageDiscoverer = undefined;
      this.manifestPackageResolver = undefined;
      this.logger = loggerOrManifestResolver as AtlasLogger;
      return;
    }
    this.modelLoader = undefined;
    this.packageDiscoverer = modelOrPackageLoader;
    this.manifestPackageResolver = loggerOrManifestResolver as ManifestWorkspacePackageResolver;
    if (legacyLogger === undefined) {
      throw new Error('Atlas legacy workspace composition requires a logger.');
    }
    this.logger = legacyLogger;
  }

  /**
   * Loads the complete project state required by an Atlas command.
   *
   * @param request - Command invocation paths supplied by the presentation layer.
   * @returns Composed policy, resolved paths, and the successfully loaded model subset.
   */
  public async load(request: WorkspaceLoadingRequest): Promise<WorkspaceSnapshot> {
    const partialPaths = await this.pathResolver.resolveConfigurationPath(
      request.invocationDirectoryPath,
      request.workspaceOption,
      request.configurationOption
    );
    const configuration = await this.configurationLoader.load(partialPaths.configurationPath);
    const artifacts = this.toArtifactConfiguration(configuration);
    const projectPaths = this.isVersionTwo(configuration)
      ? new ResolvedWorkspacePaths(
          dirname(partialPaths.configurationPath),
          partialPaths.configurationPath,
          undefined
        )
      : partialPaths;
    const paths = await this.pathResolver.resolveArtifactRoot(
      projectPaths,
      artifacts,
      request.outputOption
    );

    if (this.isVersionTwo(configuration)) {
      if (this.modelLoader === undefined) {
        throw new Error('Atlas version-two workspace model loading is not configured.');
      }
      const loaded = await this.modelLoader.loadConfigured(
        paths.workspaceRootPath,
        configuration.modules
      );
      this.validateGroupMembership(configuration, loaded.modulesById);
      const packages = [...loaded.workspace.modules.values()].map(
        (model) =>
          new WorkspacePackage(
            model.module.id,
            paths.workspaceRootPath,
            '.',
            [],
            (loaded.modulesById.get(model.module.id)?.diagrams ?? []).some(
              (diagram) => diagram.scope.type === 'module'
            )
              ? 'runtime'
              : 'support',
            loaded.modulesById.get(model.module.id)?.tags ?? [],
            undefined
          )
      );
      for (const missingModelPath of loaded.missingModelPaths) {
        this.logger.warn('Atlas skipped a missing configured generated model.', {
          values: { modelPath: missingModelPath }
        });
      }
      this.logLoadedWorkspace(paths, packages, loaded.missingModelPaths);
      return new WorkspaceSnapshot(
        paths,
        configuration,
        packages,
        loaded.workspace,
        loaded.missingModelPaths,
        loaded.modulesById
      );
    }

    const packages = await this.discoverLegacyPackages(
      request,
      paths.workspaceRootPath,
      configuration
    );
    this.logLoadedWorkspace(paths, packages, []);
    return new WorkspaceSnapshot(paths, configuration, packages);
  }

  /** Rejects a loaded module that matches more than one group in the same project diagram. */
  private validateGroupMembership(
    configuration: AtlasConfiguration,
    modulesById: ReadonlyMap<string, AtlasModuleConfiguration>
  ): void {
    for (const diagram of configuration.project.diagrams ?? []) {
      for (const [moduleId, module] of modulesById) {
        const matchingGroups = (diagram.groups ?? []).filter((group) => {
          const idMatches =
            group.selector.moduleIds === undefined ||
            group.selector.moduleIds.some((pattern) => this.matchesId(moduleId, pattern));
          const tagMatches =
            group.selector.moduleTags === undefined ||
            group.selector.moduleTags.some((tag) => module.tags?.includes(tag) === true);
          return idMatches && tagMatches;
        });
        if (matchingGroups.length > 1) {
          throw new Error(
            `Atlas project diagram '${diagram.id}' assigns module '${moduleId}' to overlapping groups '${matchingGroups.map((group) => group.id).join("', '")}'.`
          );
        }
      }
    }
  }

  /** Matches the complete opaque module ID pattern grammar. */
  private matchesId(value: string, pattern: string): boolean {
    const expression = pattern
      .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('\\*', '.*')
      .replaceAll('\\?', '.');
    return new RegExp(`^${expression}$`, 'u').test(value);
  }

  /** Extracts artifact placement from the canonical project shape or a legacy test fixture. */
  private toArtifactConfiguration(configuration: AtlasConfiguration): AtlasArtifactConfiguration {
    if (this.isVersionTwo(configuration)) return configuration.project.artifacts;
    return (configuration as unknown as LegacyAtlasConfiguration).artifacts ?? { root: 'atlas' };
  }

  /** Uses legacy discovery only for callers that supplied an old structural fixture. */
  private async discoverLegacyPackages(
    request: WorkspaceLoadingRequest,
    workspaceRootPath: string,
    configuration: AtlasConfiguration
  ): Promise<readonly WorkspacePackage[]> {
    if (request.manifestOption !== undefined && this.manifestPackageResolver !== undefined) {
      return this.manifestPackageResolver.resolve(
        request.manifestOption,
        workspaceRootPath,
        configuration
      );
    }
    if (this.packageDiscoverer === undefined) {
      throw new Error('Atlas source package discovery is not configured.');
    }
    return this.packageDiscoverer.discover(workspaceRootPath, configuration);
  }

  /** Records the loaded subset and paths that made it partial. */
  private logLoadedWorkspace(
    paths: Awaited<ReturnType<WorkspacePathResolver['resolveArtifactRoot']>>,
    packages: readonly WorkspacePackage[],
    missingModelPaths: readonly string[]
  ): void {
    this.logger.info('Atlas loaded composed project policy and configured model selection.', {
      values: {
        workspaceRootPath: paths.workspaceRootPath,
        configurationPath: paths.configurationPath,
        artifactRootPath: paths.artifactRootPath,
        loadedModuleIds: packages.map((workspacePackage) => workspacePackage.name),
        missingModelPaths
      }
    });
  }

  /** Identifies the canonical model-loading capability without depending on a concrete adapter. */
  private isModelLoader(
    value: AtlasWorkspaceLoader | WorkspacePackageDiscoverer
  ): value is AtlasWorkspaceLoader {
    return 'loadConfigured' in value && typeof value.loadConfigured === 'function';
  }

  /** Identifies the canonical composed document at the compatibility boundary. */
  private isVersionTwo(configuration: AtlasConfiguration): boolean {
    return configuration.schemaVersion === 2 && configuration.documentType === 'root';
  }
}

/**
 * Describes only the legacy artifact field needed by the temporary constructor compatibility path.
 */
interface LegacyAtlasConfiguration {
  /** Defines legacy artifact placement. */
  readonly artifacts?: AtlasArtifactConfiguration;
}
