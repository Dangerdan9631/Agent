import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

/**
 * Loads the workspace state needed before an Atlas command performs analysis or generation.
 */
export interface WorkspaceLoadingWorkflow {
  /**
   * Loads policy, paths, and explicitly classified packages for one command invocation.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @returns Fully loaded workspace state.
   */
  load(request: WorkspaceLoadingRequest): Promise<WorkspaceSnapshot>;
}
