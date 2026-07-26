import type { ArchitectureGenerationResult } from '#application/diagram/model/ArchitectureGenerationResult.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

/**
 * Generates one validated semantic diagram scope.
 */
export interface ArchitectureDiagramWorkflow {
  /**
   * Generates exactly one known scope after validation unless enforcement is bypassed.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param scope - Stable landscape or package scope identifier.
   * @param skipValidation - Allows diagram regeneration despite error-severity policy violations.
   * @returns Validation outcome with the generated scope when successful.
   */
  execute(
    request: WorkspaceLoadingRequest,
    scope: string,
    skipValidation: boolean
  ): Promise<ArchitectureGenerationResult>;
}
