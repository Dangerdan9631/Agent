import type { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import { ArchitectureGenerationResult } from '#application/diagram/model/ArchitectureGenerationResult.js';
import type { ArchitectureDiagramWorkflow } from '#application/diagram/ports/ArchitectureDiagramWorkflow.js';
import type { DiagramArtifactWriter } from '#application/diagram/ports/DiagramArtifactWriter.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { DeclarationGraph } from '#application/graph/model/DeclarationGraph.js';
import type { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';

/**
 * Orchestrates validation-aware generation of one requested existing diagram scope.
 */
export class GenerateDiagram implements ArchitectureDiagramWorkflow {
  /**
   * Creates scoped diagram generation from validation, graph, projection, and persistence collaborators.
   *
   * @param validationWorkflow - Produces workspace analysis and declared-rule outcome.
   * @param graphBuilder - Builds the declaration-level semantic graph.
   * @param projectionService - Projects the semantic graph into generated scopes.
   * @param artifactWriter - Persists the requested scope's graph, layout, and HTML artifacts.
   */
  public constructor(
    private readonly validationWorkflow: ArchitectureValidationWorkflow,
    private readonly projectionService: DiagramProjectionService,
    private readonly artifactWriter: DiagramArtifactWriter,
    private readonly federatedGraphAdapter: FederatedDeclarationGraphAdapter
  ) {}

  /**
   * Validates and writes one existing scope, rejecting unknown scopes without filesystem mutation.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param scope - Stable landscape or package scope identifier.
   * @param skipValidation - Allows diagram regeneration despite error-severity policy violations.
   * @returns Validation outcome with the requested generated diagram when successful.
   */
  public async execute(
    request: WorkspaceLoadingRequest,
    scope: string,
    skipValidation: boolean
  ): Promise<ArchitectureGenerationResult> {
    const validationResult = await this.validationWorkflow.execute(request);
    if (!skipValidation && validationResult.validation.hasErrors()) {
      return new ArchitectureGenerationResult(validationResult, undefined, []);
    }

    const graph = this.buildGraph(validationResult.workspace);
    const diagrams = this.projectionService.project(validationResult.workspace, graph);
    const diagram = diagrams.find((candidate) => candidate.scope === scope);
    if (diagram === undefined) {
      throw new Error(`Atlas does not have a generated diagram scope named '${scope}'.`);
    }
    await this.artifactWriter.writeScope(validationResult.workspace, diagram, diagrams);
    return new ArchitectureGenerationResult(validationResult, graph, [diagram]);
  }

  /** Builds the complete graph from the configured, successfully loaded model subset. */
  private buildGraph(workspace: WorkspaceSnapshot): DeclarationGraph {
    if (workspace.modelWorkspace === undefined) {
      throw new Error('Atlas diagram generation requires configured generated module models.');
    }
    return this.federatedGraphAdapter.toGraph(workspace.modelWorkspace);
  }
}
