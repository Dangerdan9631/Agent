import type { AtlasArtifactConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import type { WorkspacePathResolver } from '#application/workspace/ports/WorkspacePathResolver.js';
import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import { WorkspacePathResolutionError } from '#infrastructure/workspace/WorkspacePathResolutionError.js';

/**
 * Resolves Node.js filesystem paths for Atlas command invocations.
 */
export class NodeWorkspacePathResolver implements WorkspacePathResolver {
  /**
   * Resolves the workspace root and selected configuration file path.
   *
   * @param invocationDirectoryPath - Absolute process working directory.
   * @param workspaceOption - Optional workspace path supplied by the user.
   * @param configurationOption - Optional configuration path supplied by the user.
   * @returns Partial paths with no artifact root until configuration loading completes.
   */
  public async resolveConfigurationPath(
    invocationDirectoryPath: string,
    workspaceOption: string | undefined,
    configurationOption: string | undefined
  ): Promise<ResolvedWorkspacePaths> {
    const workspaceCandidatePath = this.resolveFrom(
      invocationDirectoryPath,
      workspaceOption ?? '.'
    );
    const workspaceRootPath = await this.resolveExistingDirectory(
      workspaceCandidatePath,
      'workspace root'
    );
    const configurationPath = this.resolveFrom(
      workspaceRootPath,
      configurationOption ?? 'atlas.config.json'
    );

    return new ResolvedWorkspacePaths(workspaceRootPath, configurationPath, undefined);
  }

  /**
   * Resolves the configured or overridden artifact output root.
   *
   * @param partialPaths - Workspace and configuration paths resolved before configuration loading.
   * @param artifacts - Optional configured artifact settings.
   * @param outputOption - Optional command-line artifact root override.
   * @returns Fully resolved invocation paths.
   */
  public resolveArtifactRoot(
    partialPaths: ResolvedWorkspacePaths,
    artifacts: AtlasArtifactConfiguration | undefined,
    outputOption: string | undefined
  ): Promise<ResolvedWorkspacePaths> {
    const configuredRoot = outputOption ?? artifacts?.root ?? 'architecture';

    if (configuredRoot.trim().length === 0) {
      throw new WorkspacePathResolutionError('Artifact output root must not be empty.');
    }

    const artifactRootPath = this.resolveFrom(partialPaths.workspaceRootPath, configuredRoot);

    return Promise.resolve(
      new ResolvedWorkspacePaths(
        partialPaths.workspaceRootPath,
        partialPaths.configurationPath,
        artifactRootPath
      )
    );
  }

  /**
   * Resolves a path against a base only when it is not already absolute.
   *
   * @param basePath - Absolute path used to resolve a relative user-owned path.
   * @param candidatePath - Absolute or relative user-owned path.
   * @returns Lexically resolved absolute path.
   */
  private resolveFrom(basePath: string, candidatePath: string): string {
    return isAbsolute(candidatePath) ? resolve(candidatePath) : resolve(basePath, candidatePath);
  }

  /**
   * Resolves one existing directory through filesystem symlinks.
   *
   * @param candidatePath - Absolute candidate directory path.
   * @param subject - Human-readable path role for diagnostics.
   * @returns Canonical real directory path.
   */
  private async resolveExistingDirectory(candidatePath: string, subject: string): Promise<string> {
    try {
      const candidateStat = await stat(candidatePath);
      if (!candidateStat.isDirectory()) {
        throw new WorkspacePathResolutionError(`${subject} '${candidatePath}' is not a directory.`);
      }
      return await realpath(candidatePath);
    } catch (error: unknown) {
      if (error instanceof WorkspacePathResolutionError) {
        throw error;
      }
      throw new WorkspacePathResolutionError(`${subject} '${candidatePath}' does not exist.`);
    }
  }
}
