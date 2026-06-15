import {
  RepositoryWorkflowReportViewService,
  type RepositoryWorkflowReportSummary,
} from '../../../sdk/interactive/repository-workflows.js';
import { listTaskSpecSummaries } from './task-specs.js';

export type { RepositoryWorkflowReportSummary };

/**
 * Default SDK-backed repository workflow view service for legacy read-model callers.
 */
const defaultReportViewService = new RepositoryWorkflowReportViewService();

/**
 * Assembles a repository workflow report summary for one task spec directory.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param directoryName - Task spec directory basename under `specs/`.
 * @returns Parsed report summary for Ink list and detail screens.
 */
export async function assembleRepositoryWorkflowReportSummary(
  projectRoot: string,
  directoryName: string,
): Promise<RepositoryWorkflowReportSummary> {
  return defaultReportViewService.assembleReportSummary(projectRoot, directoryName);
}

/**
 * Lists repository workflow report summaries for recognized task specs that have reports.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Report summaries sorted by numeric task spec id.
 */
export async function listRepositoryWorkflowReportSummaries(
  projectRoot: string,
): Promise<RepositoryWorkflowReportSummary[]> {
  const taskSpecs = await listTaskSpecSummaries(projectRoot);
  return defaultReportViewService.listReportSummaries(projectRoot, taskSpecs.recognized);
}
