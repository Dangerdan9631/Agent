import type { ArtifactServerLocation } from '#application/view/model/ArtifactServerLocation.js';
import type { ArtifactServer } from '#application/view/ports/ArtifactServer.js';
import type { ArtifactBrowser } from '#application/view/ports/ArtifactBrowser.js';
import type { ViewArtifactsWorkflow } from '#application/view/ports/ViewArtifactsWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';

/**
 * Resolves a workspace and starts a constrained local server for its generated artifacts.
 */
export class ViewArtifacts implements ViewArtifactsWorkflow {
  /**
   * Creates artifact-viewing behavior from workspace loading and local-server boundaries.
   *
   * @param workspaceLoader - Resolves configuration and artifact-root paths.
   * @param artifactServer - Starts safe static serving for the selected root.
   */
  public constructor(
    private readonly workspaceLoader: WorkspaceLoadingWorkflow,
    private readonly artifactServer: ArtifactServer,
    private readonly artifactBrowser: ArtifactBrowser
  ) {}

  /**
   * Resolves the configured artifact root and starts its local server.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param host - Interface hostname or address to bind.
   * @param port - TCP port to bind.
   * @param openBrowser - Determines whether the ready local URL should open in the user's default browser.
   * @returns Active local server location.
   */
  public async execute(
    request: WorkspaceLoadingRequest,
    host: string,
    port: number,
    openBrowser: boolean
  ): Promise<ArtifactServerLocation> {
    const workspace = await this.workspaceLoader.load(request);
    if (workspace.paths.artifactRootPath === undefined) {
      throw new Error('Atlas cannot serve artifacts before resolving an artifact root.');
    }
    const location = await this.artifactServer.start(
      workspace.paths.artifactRootPath,
      host,
      port,
      workspace.paths.configurationPath
    );
    if (openBrowser) {
      await this.artifactBrowser.open(location.url);
    }
    return location;
  }
}
