import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

/**
 * Resolves and removes regenerable artifacts for one Atlas workspace.
 */
export interface CleanArtifactsWorkflow {
  /**
   * Removes configured artifact-root children after the caller has obtained confirmation.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @returns Count of direct artifact-root children removed.
   */
  execute(request: WorkspaceLoadingRequest): Promise<number>;
}
