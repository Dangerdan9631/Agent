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
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
import type { WorkspacePathResolver } from '#application/workspace/ports/WorkspacePathResolver.js';
import { dirname, join } from 'node:path';

/**
 * Loads composed project policy and only the generated models selected by its ordered module list.
 */
export class WorkspaceLoader implements WorkspaceLoadingWorkflow {
  /**
   * Creates workspace loading from configuration, model, path, and diagnostic boundaries.
   *
   * @param pathResolver - Resolves invocation-owned configuration and artifact paths.
   * @param configurationLoader - Loads the composed version-two root configuration.
   * @param modelLoader - Loads only models selected by configured module entries.
   * @param logger - Records resolved selection and missing generated outputs.
   */
  public constructor(
    private readonly pathResolver: WorkspacePathResolver,
    private readonly configurationLoader: AtlasConfigurationLoader,
    private readonly modelLoader: AtlasWorkspaceLoader,
    private readonly logger: AtlasLogger
  ) {}

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
    const projectPaths = new ResolvedWorkspacePaths(
      dirname(partialPaths.configurationPath),
      partialPaths.configurationPath,
      undefined
    );
    const paths = await this.pathResolver.resolveArtifactRoot(
      projectPaths,
      artifacts,
      request.outputOption
    );

    const loaded = await this.modelLoader.loadConfigured(
      join(paths.artifactRootPath!, 'model'),
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

  /** Extracts artifact placement from the canonical project shape. */
  private toArtifactConfiguration(configuration: AtlasConfiguration): AtlasArtifactConfiguration {
    return configuration.project.artifacts;
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
}
