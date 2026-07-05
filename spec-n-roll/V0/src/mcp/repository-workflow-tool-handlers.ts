import {
  loadRepositoryWorkflowReportReadResult,
  loadRepositoryWorkflowTypesResult,
  type RepositoryWorkflowPlanReadResult,
  type RepositoryWorkflowReportReadResult,
  type RepositoryWorkflowTypesResult,
} from '../sdk/repository-workflow.js';
import {
  planRepositoryWorkflow,
  runRepositoryDriftWorkflow,
  startRepositoryWorkflow,
  type RepositoryDriftWorkflowResult,
  type StartRepositoryWorkflowInput,
  type StartRepositoryWorkflowResult,
} from '../sdk/repository/workflow-run.js';

import type {
  DiscoveryPlanBounds,
  RepositoryWorkflowScope,
  RepositoryWorkflowTypeId,
} from '../sdk/config/schema.js';

/**
 * Input accepted by the `repository_workflow_types_list` MCP tool.
 */
export type RepositoryWorkflowTypesListToolInput = Record<string, never>;

/**
 * Input accepted by the `repository_workflow_start` MCP tool.
 */
export interface RepositoryWorkflowStartToolInput {
  /**
   * Repository workflow type id to start.
   */
  workflowTypeId: StartRepositoryWorkflowInput['workflowTypeId'];
  /**
   * Optional maintainer-provided goal text for the run.
   */
  description?: string;
}

/**
 * Input accepted by the `repository_workflow_plan` MCP tool.
 */
export interface RepositoryWorkflowPlanToolInput {
  /**
   * Repository workflow type id to plan.
   */
  workflowTypeId: RepositoryWorkflowTypeId;
  /**
   * Optional maintainer-provided scope hints.
   */
  scope?: RepositoryWorkflowScope;
  /**
   * Optional bounded discovery limits for large repositories.
   */
  bounds?: DiscoveryPlanBounds;
}

/**
 * Executes the `repository_workflow_types_list` tool payload.
 *
 * @returns JSON payload matching CLI type listing output.
 */
export function executeRepositoryWorkflowTypesList(): RepositoryWorkflowTypesResult {
  return loadRepositoryWorkflowTypesResult();
}

/**
 * Input accepted by the `repository_workflow_drift_run` MCP tool.
 */
export interface RepositoryWorkflowDriftRunToolInput {
  /**
   * Optional maintainer-provided goal text for the drift run.
   */
  description?: string;
}

/**
 * Executes the `repository_workflow_drift_run` tool payload against project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Optional drift run description.
 * @returns Completed drift workflow result ending after specify.
 */
export async function executeRepositoryWorkflowDriftRun(
  projectRoot: string,
  input: RepositoryWorkflowDriftRunToolInput = {},
): Promise<RepositoryDriftWorkflowResult> {
  return runRepositoryDriftWorkflow({
    projectRoot,
    description: input.description,
  });
}

/**
 * Executes the `repository_workflow_start` tool payload against project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Workflow type and optional description.
 * @returns Start result with recommended discovery plan.
 */
export async function executeRepositoryWorkflowStart(
  projectRoot: string,
  input: RepositoryWorkflowStartToolInput,
): Promise<StartRepositoryWorkflowResult> {
  return startRepositoryWorkflow({
    projectRoot,
    workflowTypeId: input.workflowTypeId,
    description: input.description,
  });
}

/**
 * Executes the `repository_workflow_plan` tool payload against project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Workflow type and optional scope or bounds hints.
 * @returns Plan result with recommended discovery plan.
 */
export async function executeRepositoryWorkflowPlan(
  projectRoot: string,
  input: RepositoryWorkflowPlanToolInput,
): Promise<RepositoryWorkflowPlanReadResult> {
  return planRepositoryWorkflow({
    projectRoot,
    workflowTypeId: input.workflowTypeId,
    scope: input.scope,
    bounds: input.bounds,
  });
}

/**
 * Input accepted by the `repository_workflow_report_read` MCP tool.
 */
export interface RepositoryWorkflowReportReadToolInput {
  /**
   * Zero-padded numeric task spec id for the report artifact.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
}

/**
 * Executes the `repository_workflow_report_read` tool payload against project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Task spec identity for the report artifact.
 * @returns Report read result with markdown content and metadata.
 */
export async function executeRepositoryWorkflowReportRead(
  projectRoot: string,
  input: RepositoryWorkflowReportReadToolInput,
): Promise<RepositoryWorkflowReportReadResult> {
  return loadRepositoryWorkflowReportReadResult(projectRoot, input.taskSpecId, input.slug);
}
