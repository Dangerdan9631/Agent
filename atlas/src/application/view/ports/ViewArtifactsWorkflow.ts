import type { ArtifactServerLocation } from '#application/view/model/ArtifactServerLocation.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

/**
 * Resolves and serves generated artifacts for one Atlas workspace.
 */
export interface ViewArtifactsWorkflow {
  /**
   * Starts a local server rooted at the selected workspace's artifact directory.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param host - Interface hostname or address to bind.
   * @param port - TCP port to bind.
   * @param openBrowser - Determines whether the ready local URL should open in the user's default browser.
   * @returns Active local server location.
   */
  execute(
    request: WorkspaceLoadingRequest,
    host: string,
    port: number,
    openBrowser: boolean
  ): Promise<ArtifactServerLocation>;
}
