import type { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import { ArchitectureGenerationResult } from '#application/diagram/model/ArchitectureGenerationResult.js';
import type { ArchitectureGenerationWorkflow } from '#application/diagram/ports/ArchitectureGenerationWorkflow.js';
import type { DiagramArtifactWriter } from '#application/diagram/ports/DiagramArtifactWriter.js';
import type { DeclarationGraphBuilder } from '#application/graph/ports/DeclarationGraphBuilder.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

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
    private readonly artifactWriter: DiagramArtifactWriter
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

    const graph = await this.graphBuilder.build(validationResult.workspace);
    const diagrams = this.projectionService.project(validationResult.workspace, graph);
    await this.artifactWriter.write(validationResult.workspace, diagrams);

    return new ArchitectureGenerationResult(validationResult, graph, diagrams);
  }
}
