import type { ArtifactServer } from '#application/view/ports/ArtifactServer.js';
import type { ViewArtifactsWorkflow } from '#application/view/ports/ViewArtifactsWorkflow.js';
import type { AtlasArtifactHostOptions } from '#composition/AtlasArtifactHostOptions.js';

/**
 * Hosts one generated Atlas artifact workspace for a desktop or browser presentation surface.
 */
export class AtlasArtifactHost {
  /**
   * Creates a host from the application viewing workflow and its owned server resource.
   *
   * @param viewWorkflow - Resolves the selected workspace and starts its constrained local server.
   * @param artifactServer - Owns the listener resource that must be released when the host closes.
   */
  public constructor(
    private readonly viewWorkflow: ViewArtifactsWorkflow,
    private readonly artifactServer: ArtifactServer
  ) {}

  /**
   * Starts serving one selected workspace without opening a second browser window.
   *
   * @param options - Invocation paths and optional listener settings selected by the presentation host.
   * @returns Absolute local URL for the generated landscape viewer.
   */
  public async start(options: AtlasArtifactHostOptions): Promise<string> {
    const location = await this.viewWorkflow.execute(
      {
        invocationDirectoryPath: options.invocationDirectoryPath,
        workspaceOption: options.workspacePath,
        configurationOption: options.configurationPath,
        outputOption: options.outputPath,
        manifestOption: options.manifestPath
      },
      options.host ?? '127.0.0.1',
      options.port ?? 0,
      false
    );
    return location.url;
  }

  /**
   * Releases the local listener when the owning presentation surface closes.
   *
   * @returns A promise that resolves after the listener has stopped.
   */
  public stop(): Promise<void> {
    return this.artifactServer.stop();
  }
}
