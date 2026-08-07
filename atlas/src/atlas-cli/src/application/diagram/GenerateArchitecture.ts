import type { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import { ArchitectureGenerationResult } from '#application/diagram/model/ArchitectureGenerationResult.js';
import type { ArchitectureGenerationWorkflow } from '#application/diagram/ports/ArchitectureGenerationWorkflow.js';
import type { DiagramArtifactWriter } from '#application/diagram/ports/DiagramArtifactWriter.js';
import type { DeclarationGraphBuilder } from '#application/graph/ports/DeclarationGraphBuilder.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { DeclarationGraph } from '#application/graph/model/DeclarationGraph.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import type { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import type { AtlasModelGenerator } from '#application/federation/ports/AtlasModelGenerator.js';
import { resolve } from 'node:path';

/**
 * Generates semantic graph artifacts after validation unless the command explicitly bypasses enforcement.
 */
export class GenerateArchitecture implements ArchitectureGenerationWorkflow {
  /**
   * Creates generation behavior from validation, semantic graph, projection, and persistence collaborators.
   *
   * @param validationWorkflow - Produces workspace analysis and declared-rule outcome.
   * @param graphBuilder - Builds the declaration-level semantic graph.
   * @param projectionService - Projects the semantic graph into generated scopes.
   * @param artifactWriter - Persists diagram data and HTML artifacts.
   */
  public constructor(
    private readonly validationWorkflow: ArchitectureValidationWorkflow,
    private readonly graphBuilder: DeclarationGraphBuilder,
    private readonly projectionService: DiagramProjectionService,
    private readonly artifactWriter: DiagramArtifactWriter,
    private readonly manifestLoader?: AtlasWorkspaceLoader,
    private readonly federatedGraphAdapter?: FederatedDeclarationGraphAdapter,
    private readonly modelGenerator?: AtlasModelGenerator
  ) {}

  /**
   * Generates all initial scopes when validation permits generation or is explicitly bypassed.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param skipValidation - Allows graph generation despite error-severity policy violations.
   * @returns Validation outcome with optional generated graph and scope diagrams.
   */
  public async execute(
    request: WorkspaceLoadingRequest,
    skipValidation: boolean
  ): Promise<ArchitectureGenerationResult> {
    const validationResult = await this.validationWorkflow.execute(request);
    if (!skipValidation && validationResult.validation.hasErrors()) {
      return new ArchitectureGenerationResult(validationResult, undefined, []);
    }

    const graph = await this.buildGraph(request, validationResult.workspace);
    const diagrams = this.projectionService.project(validationResult.workspace, graph);
    await this.artifactWriter.write(validationResult.workspace, diagrams);

    return new ArchitectureGenerationResult(validationResult, graph, diagrams);
  }

  /** Builds the selected manifest graph or the compatibility TypeScript graph. */
  private async buildGraph(
    request: WorkspaceLoadingRequest,
    workspace: WorkspaceSnapshot
  ): Promise<DeclarationGraph> {
    const manifestPath = await this.toManifestPath(request, workspace);
    if (manifestPath === undefined) return this.graphBuilder.build(workspace);
    if (this.manifestLoader === undefined || this.federatedGraphAdapter === undefined) {
      throw new Error('Atlas manifest graph generation is not configured for this command host.');
    }
    return this.federatedGraphAdapter.toGraph(await this.manifestLoader.load(manifestPath));
  }

  /** Resolves a selected manifest or generates the compatibility manifest from selected packages. */
  private async toManifestPath(
    request: WorkspaceLoadingRequest,
    workspace: WorkspaceSnapshot
  ): Promise<string | undefined> {
    if (request.manifestOption !== undefined) return request.manifestOption;
    if (this.modelGenerator === undefined) return undefined;
    if (workspace.paths.artifactRootPath === undefined) {
      throw new Error(
        'Atlas requires an artifact root to generate its canonical workspace manifest.'
      );
    }
    return this.modelGenerator.generate(
      workspace,
      resolve(workspace.paths.artifactRootPath, 'models')
    );
  }
}
