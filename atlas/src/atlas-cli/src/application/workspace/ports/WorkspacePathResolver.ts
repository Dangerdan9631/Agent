import type { AtlasArtifactConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';

/**
 * Resolves command-line workspace paths before Atlas accesses user-owned files or artifact locations.
 */
export interface WorkspacePathResolver {
  /**
   * Resolves workspace and configuration paths before configuration loading.
   *
   * @param invocationDirectoryPath - Absolute process working directory used as the initial path base.
   * @param workspaceOption - Optional workspace path supplied by the user.
   * @param configurationOption - Optional configuration path supplied by the user.
   * @returns Resolved paths with no artifact root until configuration is loaded.
   */
  resolveConfigurationPath(
    invocationDirectoryPath: string,
    workspaceOption: string | undefined,
    configurationOption: string | undefined
  ): Promise<ResolvedWorkspacePaths>;

  /**
   * Resolves an artifact root after configuration has been validated.
   *
   * @param partialPaths - Previously resolved workspace and configuration paths.
   * @param artifacts - Configured artifact output settings.
   * @param outputOption - Optional command-line artifact root override.
   * @returns Fully resolved invocation paths.
   */
  resolveArtifactRoot(
    partialPaths: ResolvedWorkspacePaths,
    artifacts: AtlasArtifactConfiguration | undefined,
    outputOption: string | undefined
  ): Promise<ResolvedWorkspacePaths>;
}
