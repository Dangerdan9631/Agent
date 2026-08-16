import type { ValidationCommandResult } from '#application/validation/model/ValidationCommandResult.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

/**
 * Executes complete dependency analysis and declared-rule validation for one command invocation.
 */
export interface ArchitectureValidationWorkflow {
  /**
   * Loads the workspace, analyses dependencies, and evaluates every declared rule.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @returns Complete analysis and validation outcome.
   */
  execute(
    request: WorkspaceLoadingRequest,
    enforcementEnabled?: boolean
  ): Promise<ValidationCommandResult>;
}
