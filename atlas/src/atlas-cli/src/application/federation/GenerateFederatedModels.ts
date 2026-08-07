import type { AtlasModelGenerator } from '#application/federation/ports/AtlasModelGenerator.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
import { resolve } from 'node:path';

/**
 * Coordinates source-ecosystem model generation using the current Atlas workspace policy.
 */
export class GenerateFederatedModels {
  /**
   * Creates model generation from workspace loading and a source-ecosystem generator boundary.
   *
   * @param workspaceLoader - Loads selected source packages and output policy.
   * @param modelGenerator - Produces one portable model for each selected artifact.
   */
  public constructor(
    private readonly workspaceLoader: WorkspaceLoadingWorkflow,
    private readonly modelGenerator: AtlasModelGenerator
  ) {}

  /**
   * Generates module models under the configured artifact root.
   *
   * @param request - Workspace path options supplied by the command boundary.
   * @returns Absolute path of the generated workspace manifest.
   */
  public async execute(request: WorkspaceLoadingRequest): Promise<string> {
    const workspace = await this.workspaceLoader.load(request);
    if (workspace.paths.artifactRootPath === undefined) {
      throw new Error('Atlas requires an artifact root to generate federated models.');
    }
    return this.modelGenerator.generate(
      workspace,
      resolve(workspace.paths.artifactRootPath, 'models')
    );
  }
}
