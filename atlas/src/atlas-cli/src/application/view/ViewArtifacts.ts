import type { ArtifactServerLocation } from '#application/view/model/ArtifactServerLocation.js';
import type { ArtifactServer } from '#application/view/ports/ArtifactServer.js';
import type { ArtifactBrowser } from '#application/view/ports/ArtifactBrowser.js';
import type { ViewArtifactsWorkflow } from '#application/view/ports/ViewArtifactsWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
import type { ArchitectureGenerationWorkflow } from '#application/diagram/ports/ArchitectureGenerationWorkflow.js';
import type { ArtifactConfigurationChangeHandler } from '#application/view/ports/ArtifactConfigurationChangeHandler.js';

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
    private readonly artifactBrowser: ArtifactBrowser,
    private readonly generationWorkflow?: ArchitectureGenerationWorkflow
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
    await this.generateSelectedManifest(request);
    const workspace = await this.workspaceLoader.load(request);
    if (workspace.paths.artifactRootPath === undefined) {
      throw new Error('Atlas cannot serve artifacts before resolving an artifact root.');
    }
    const location = await this.artifactServer.start(
      workspace.paths.artifactRootPath,
      host,
      port,
      workspace.paths.configurationPath,
      this.configurationChangeHandler(request)
    );
    if (openBrowser) {
      await this.artifactBrowser.open(location.url);
    }
    return location;
  }

  /** Generates manifest-selected artifacts before serving so the viewer receives the requested workspace. */
  private async generateSelectedManifest(request: WorkspaceLoadingRequest): Promise<void> {
    if (request.manifestOption === undefined || this.generationWorkflow === undefined) return;
    const result = await this.generationWorkflow.execute(request, false);
    if (!result.generated()) {
      throw new Error(
        'Atlas cannot serve a federated manifest while architecture validation has errors.'
      );
    }
  }

  /** Creates the application-owned refresh callback used after viewer policy changes. */
  private configurationChangeHandler(
    request: WorkspaceLoadingRequest
  ): ArtifactConfigurationChangeHandler | undefined {
    const generationWorkflow = this.generationWorkflow;
    if (generationWorkflow === undefined) return undefined;
    return {
      execute: async () => {
        const result = await generationWorkflow.execute(request, true);
        if (!result.generated()) {
          throw new Error('Atlas could not refresh diagram artifacts after changing policy.');
        }
      }
    };
  }
}
