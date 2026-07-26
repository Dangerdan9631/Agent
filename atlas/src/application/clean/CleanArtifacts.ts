import type { ArtifactCleaner } from '#application/clean/ports/ArtifactCleaner.js';
import type { CleanArtifactsWorkflow } from '#application/clean/ports/CleanArtifactsWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';

/**
 * Resolves a workspace and removes only the regenerable children of its artifact root.
 */
export class CleanArtifacts implements CleanArtifactsWorkflow {
  /**
   * Creates cleanup behavior from workspace resolution and constrained filesystem cleanup boundaries.
   *
   * @param workspaceLoader - Resolves configuration and artifact-root paths.
   * @param artifactCleaner - Removes direct children under the resolved artifact root.
   */
  public constructor(
    private readonly workspaceLoader: WorkspaceLoadingWorkflow,
    private readonly artifactCleaner: ArtifactCleaner
  ) {}

  /**
   * Resolves and cleans the selected workspace's artifact root.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @returns Count of direct artifact-root children removed.
   */
  public async execute(request: WorkspaceLoadingRequest): Promise<number> {
    const workspace = await this.workspaceLoader.load(request);
    if (workspace.paths.artifactRootPath === undefined) {
      throw new Error('Atlas cannot clean artifacts before resolving an artifact root.');
    }
    return this.artifactCleaner.clean(workspace.paths.artifactRootPath);
  }
}
