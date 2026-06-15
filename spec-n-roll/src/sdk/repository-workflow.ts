import { listRepositoryWorkflowTypes, type RepositoryWorkflowPlanResult } from './repository/workflow-run.js';
import {
  readRepositoryWorkflowReport,
  type RepositoryWorkflowReportReadResult,
} from './repository/report.js';

/**
 * JSON payload returned by repository workflow type listing.
 */
export interface RepositoryWorkflowTypesResult {
  /**
   * Supported repository workflow type metadata entries.
   */
  workflowTypes: ReturnType<typeof listRepositoryWorkflowTypes>;
}

/**
 * JSON payload returned by repository workflow plan recommendation.
 */
export type RepositoryWorkflowPlanReadResult = RepositoryWorkflowPlanResult;

export type { RepositoryWorkflowReportReadResult };

/**
 * Loads a repository workflow report for read commands.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns JSON-serializable report read payload.
 */
export async function loadRepositoryWorkflowReportReadResult(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<RepositoryWorkflowReportReadResult> {
  return readRepositoryWorkflowReport(projectRoot, taskSpecId, slug);
}

/**
 * Loads repository workflow type metadata for read commands.
 *
 * @returns JSON-serializable workflow type listing payload.
 */
export function loadRepositoryWorkflowTypesResult(): RepositoryWorkflowTypesResult {
  return {
    workflowTypes: [...listRepositoryWorkflowTypes()],
  };
}
