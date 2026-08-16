import { ArchitectureGenerationResult } from '#application/diagram/model/ArchitectureGenerationResult.js';
import type { ArchitectureGenerationWorkflow } from '#application/diagram/ports/ArchitectureGenerationWorkflow.js';
import { DeclarationGraph } from '#application/graph/model/DeclarationGraph.js';
import { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import { ValidationCommandResult } from '#application/validation/model/ValidationCommandResult.js';
import { ViewArtifacts } from '#application/view/ViewArtifacts.js';
import { ArtifactServerLocation } from '#application/view/model/ArtifactServerLocation.js';
import type { ArtifactBrowser } from '#application/view/ports/ArtifactBrowser.js';
import type { ArtifactConfigurationChangeHandler } from '#application/view/ports/ArtifactConfigurationChangeHandler.js';
import type { ArtifactServer } from '#application/view/ports/ArtifactServer.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
import { describe, expect, it } from 'vitest';

/** Returns one stable workspace without accessing the filesystem. */
class FixedWorkspaceLoader implements WorkspaceLoadingWorkflow {
  /** Loads a workspace with a resolved configuration and artifact root. */
  public load(_request: WorkspaceLoadingRequest): Promise<WorkspaceSnapshot> {
    return Promise.resolve(this.workspace());
  }

  /** Creates the stable workspace shared with successful generation results. */
  public workspace(): WorkspaceSnapshot {
    return new WorkspaceSnapshot(
      new ResolvedWorkspacePaths('/workspace', '/workspace/atlas.config.yml', '/workspace/output'),
      {
        schemaVersion: 1,
        discovery: { packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }] }
      },
      []
    );
  }
}

/** Captures generation requests made after viewer-owned policy changes. */
class RecordingGenerationWorkflow implements ArchitectureGenerationWorkflow {
  /** Holds validation bypass values in dispatch order. */
  public readonly skipValidationValues: boolean[] = [];

  /** Returns a successful empty graph after recording regeneration behavior. */
  public execute(
    _request: WorkspaceLoadingRequest,
    skipValidation: boolean
  ): Promise<ArchitectureGenerationResult> {
    this.skipValidationValues.push(skipValidation);
    const workspace = new FixedWorkspaceLoader().workspace();
    return Promise.resolve(
      new ArchitectureGenerationResult(
        new ValidationCommandResult(workspace, [], new ArchitectureValidationResult([])),
        new DeclarationGraph([], []),
        []
      )
    );
  }
}

/** Captures server startup and simulates one policy mutation refresh. */
class RefreshingArtifactServer implements ArtifactServer {
  /** Holds the configuration path selected by the application workflow. */
  public configurationPath: string | undefined;

  /** Starts a stable server fixture and invokes the supplied refresh callback once. */
  public async start(
    _artifactRootPath: string,
    _host: string,
    _port: number,
    configurationPath: string,
    configurationChangeHandler?: ArtifactConfigurationChangeHandler
  ): Promise<ArtifactServerLocation> {
    this.configurationPath = configurationPath;
    await configurationChangeHandler?.execute();
    return new ArtifactServerLocation('http://127.0.0.1:4321/landscape/index.html');
  }

  /** Completes because the fixture owns no listener. */
  public stop(): Promise<void> {
    return Promise.resolve();
  }
}

/** Captures browser-opening requests without starting a process. */
class RecordingArtifactBrowser implements ArtifactBrowser {
  /** Holds URLs requested by the workflow. */
  public readonly urls: string[] = [];

  /** Records one ready artifact URL. */
  public open(url: string): Promise<void> {
    this.urls.push(url);
    return Promise.resolve();
  }
}

/** Verifies hosted-viewer orchestration stays in the application layer. */
describe('ViewArtifacts', () => {
  /** Regenerates artifacts after policy changes and opens only the ready server URL. */
  it('wires policy refresh through generation before opening the viewer', async () => {
    const server = new RefreshingArtifactServer();
    const browser = new RecordingArtifactBrowser();
    const generation = new RecordingGenerationWorkflow();
    const workflow = new ViewArtifacts(new FixedWorkspaceLoader(), server, browser, generation);

    const location = await workflow.execute(
      {
        invocationDirectoryPath: '/workspace',
        workspaceOption: undefined,
        configurationOption: undefined,
        outputOption: undefined
      },
      '127.0.0.1',
      0,
      true
    );

    expect(location.url).toBe('http://127.0.0.1:4321/landscape/index.html');
    expect(server.configurationPath).toBe('/workspace/atlas.config.yml');
    expect(generation.skipValidationValues).toEqual([false, true]);
    expect(browser.urls).toEqual([location.url]);
  });
});
