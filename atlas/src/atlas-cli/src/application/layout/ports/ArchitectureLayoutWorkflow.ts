import type { ArchitectureLayoutResult } from '#application/layout/model/ArchitectureLayoutResult.js';
import type { LayoutOverrides } from '#application/layout/model/LayoutDocument.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';

/**
 * Rebuilds a selected graph scope and persists its deterministic layout state.
 */
export interface ArchitectureLayoutWorkflow {
  /**
   * Calculates and persists layout for one supported scope.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param scope - Stable landscape or package scope identifier.
   * @param overrides - Optional command settings applied over workspace layout defaults.
   * @param generateArtifacts - Determines whether graph and viewer artifacts must be regenerated first.
   * @returns Validation outcome with optional persisted layout state.
   */
  execute(
    request: WorkspaceLoadingRequest,
    scope: string,
    overrides: LayoutOverrides,
    generateArtifacts: boolean,
    failOnViolations?: boolean
  ): Promise<ArchitectureLayoutResult>;
}
