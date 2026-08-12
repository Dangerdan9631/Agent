import type { ArchitectureValidator } from '#application/validation/ArchitectureValidator.js';
import { ValidationCommandResult } from '#application/validation/model/ValidationCommandResult.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { DependencyAnalysisArtifactWriter } from '#application/validation/ports/DependencyAnalysisArtifactWriter.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { WorkspaceLoadingWorkflow } from '#application/workspace/ports/WorkspaceLoadingWorkflow.js';
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
    private readonly analysisArtifactWriter: DependencyAnalysisArtifactWriter,
    private readonly architectureValidator: ArchitectureValidator,
    private readonly federatedDependencyAnalysisAdapter: FederatedDependencyAnalysisAdapter
  ) {}

  /**
   * Executes one complete architecture validation invocation.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @returns Complete analysis and validation outcome.
   */
  public async execute(request: WorkspaceLoadingRequest): Promise<ValidationCommandResult> {
    const workspace = await this.workspaceLoader.load(request);
    const analysisResults = this.analyze(workspace);
    await this.analysisArtifactWriter.write(workspace, analysisResults);
    const validation = this.architectureValidator.validate(workspace, analysisResults);

    return new ValidationCommandResult(workspace, analysisResults, validation);
  }

  /** Converts the configured, loaded language-neutral model subset into validation facts. */
  private analyze(workspace: WorkspaceSnapshot): readonly DependencyAnalysisResult[] {
    if (workspace.modelWorkspace === undefined) {
      throw new Error('Atlas validation requires configured generated module models.');
    }
    return this.federatedDependencyAnalysisAdapter.analyze(workspace.modelWorkspace);
  }
}
