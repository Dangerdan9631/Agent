import type { ArchitectureGenerationResult } from '#application/diagram/model/ArchitectureGenerationResult.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

/**
 * Executes validation-aware semantic graph and diagram artifact generation.
 */
export interface ArchitectureGenerationWorkflow {
  /**
   * Generates all configured initial diagram scopes.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param skipValidation - Allows graph regeneration despite declared error-severity violations.
   * @returns Validation outcome and generated graph artifact result.
   */
  execute(
    request: WorkspaceLoadingRequest,
    skipValidation: boolean
  ): Promise<ArchitectureGenerationResult>;
}
