import type { ArchitectureValidator } from '#application/validation/ArchitectureValidator.js';
import { ValidationCommandResult } from '#application/validation/model/ValidationCommandResult.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { DependencyAnalyzer } from '#application/validation/ports/DependencyAnalyzer.js';
import type { DependencyAnalysisArtifactWriter } from '#application/validation/ports/DependencyAnalysisArtifactWriter.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import type { FederatedDependencyAnalysisAdapter } from '#application/federation/FederatedDependencyAnalysisAdapter.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';

/**
 * Runs the complete Atlas validation use case from workspace loading through policy evaluation.
 */
export class ValidateArchitecture implements ArchitectureValidationWorkflow {
  /**
   * Creates the validation workflow from workspace loading, dependency analysis, and rule evaluation collaborators.
   *
   * @param workspaceLoader - Loads validated workspace policy and package selection.
   * @param dependencyAnalyzer - Produces normalized dependencies for every selected package.
   * @param analysisArtifactWriter - Persists portable raw dependency analysis reports.
   * @param architectureValidator - Evaluates declared rules against normalized dependencies.
   */
  public constructor(
    private readonly workspaceLoader: WorkspaceLoadingWorkflow,
    private readonly dependencyAnalyzer: DependencyAnalyzer,
    private readonly analysisArtifactWriter: DependencyAnalysisArtifactWriter,
    private readonly architectureValidator: ArchitectureValidator,
    private readonly manifestLoader?: AtlasWorkspaceLoader,
    private readonly federatedDependencyAnalysisAdapter?: FederatedDependencyAnalysisAdapter
  ) {}

  /**
   * Executes one complete architecture validation invocation.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @returns Complete analysis and validation outcome.
   */
  public async execute(request: WorkspaceLoadingRequest): Promise<ValidationCommandResult> {
    const workspace = await this.workspaceLoader.load(request);
    const analysisResults = await this.analyze(request, workspace);
    await this.analysisArtifactWriter.write(workspace, analysisResults);
    const validation = this.architectureValidator.validate(workspace, analysisResults);

    return new ValidationCommandResult(workspace, analysisResults, validation);
  }

  /** Uses resolved manifest relationships when supplied, otherwise delegates to the source-ecosystem analyzer. */
  private async analyze(
    request: WorkspaceLoadingRequest,
    workspace: WorkspaceSnapshot
  ): Promise<readonly DependencyAnalysisResult[]> {
    if (request.manifestOption === undefined) return this.dependencyAnalyzer.analyze(workspace);
    if (
      this.manifestLoader === undefined ||
      this.federatedDependencyAnalysisAdapter === undefined
    ) {
      throw new Error('Atlas federated validation is not configured for this command host.');
    }
    return this.federatedDependencyAnalysisAdapter.analyze(
      await this.manifestLoader.load(request.manifestOption)
    );
  }
}
