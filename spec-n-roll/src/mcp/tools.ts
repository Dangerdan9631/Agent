import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { CoreMutationError } from '../sdk/core/errors.js';
import { updateSpecFrontmatter } from '../sdk/core/frontmatter.js';
import { readProjectMetadata, writeProjectMetadata } from '../sdk/core/project-metadata.js';
import { setTaskCheckboxes } from '../sdk/core/task-checkboxes.js';
import { setTaskSpecStatus } from '../sdk/core/task-lifecycle.js';
import { runStepFinalize, runStepInit } from '../sdk/core/step-lifecycle.js';
import { instantiateStepOutput } from '../sdk/core/templates.js';
import { readWorkflowState, writeWorkflowState } from '../sdk/core/workflow-state.js';
import {
  kebabCaseIdSchema,
  discoveryPlanBoundsSchema,
  repositoryWorkflowScopeSchema,
  repositoryWorkflowTypeIdSchema,
  taskSpecIdSchema,
} from '../sdk/config/schema.js';
import { executeSetListRead, executeSetListTriage } from './set-list-tool-handlers.js';
import {
  executeRepositoryWorkflowDriftRun,
  executeRepositoryWorkflowPlan,
  executeRepositoryWorkflowReportRead,
  executeRepositoryWorkflowStart,
  executeRepositoryWorkflowTypesList,
} from './repository-workflow-tool-handlers.js';

/**
 * Serializes a core mutation error into MCP tool error text.
 *
 * @param error - Error thrown from a core-library operation.
 * @returns Text suitable for MCP tool error content.
 */
function formatToolError(error: unknown): string {
  if (error instanceof CoreMutationError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Registers all core-library MCP tools that mirror CLI subcommands (SC-012).
 *
 * @param server - MCP server instance receiving tool handlers.
 */
export function registerCoreMcpTools(server: McpServer): void {
  const taskIdentitySchema = {
    taskSpecId: taskSpecIdSchema,
    slug: kebabCaseIdSchema,
  };

  server.registerTool(
    'workflow_state_read',
    {
      description: 'Read workflow-state.json for a task spec',
      inputSchema: taskIdentitySchema,
    },
    async ({ taskSpecId, slug }) => {
      const projectRoot = process.cwd();
      const state = await readWorkflowState(projectRoot, taskSpecId, slug);
      return {
        content: [{ type: 'text', text: JSON.stringify(state, null, 2) }],
      };
    },
  );

  server.registerTool(
    'workflow_state_write',
    {
      description: 'Write workflow-state.json for a task spec',
      inputSchema: {
        ...taskIdentitySchema,
        workflowVariantId: kebabCaseIdSchema,
        lastCompletedStepId: kebabCaseIdSchema.nullable(),
        currentStepId: kebabCaseIdSchema.nullable().optional(),
        status: z.enum(['active', 'paused', 'complete']),
      },
    },
    async (input) => {
      try {
        const projectRoot = process.cwd();
        const state = await writeWorkflowState(projectRoot, input);
        return {
          content: [{ type: 'text', text: JSON.stringify(state, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'task_spec_status_set',
    {
      description: 'Set task spec lifecycle status in spec.md frontmatter',
      inputSchema: {
        ...taskIdentitySchema,
        status: z.enum(['Active', 'Complete', 'Locked']),
      },
    },
    async ({ taskSpecId, slug, status }) => {
      try {
        const projectRoot = process.cwd();
        const result = await setTaskSpecStatus(projectRoot, taskSpecId, slug, status);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'project_metadata_read',
    {
      description: 'Read .spec-n-roll/config/project-metadata.json',
      inputSchema: {},
    },
    async () => {
      const projectRoot = process.cwd();
      const metadata = await readProjectMetadata(projectRoot);
      return {
        content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }],
      };
    },
  );

  server.registerTool(
    'project_metadata_write',
    {
      description: 'Update project metadata fields',
      inputSchema: {
        nextTaskSpecId: z.number().int().min(1).optional(),
        currentTaskSpecId: taskSpecIdSchema.nullable().optional(),
        currentTaskSlug: kebabCaseIdSchema.nullable().optional(),
        implementationStartedAt: z.string().datetime().nullable().optional(),
      },
    },
    async (input) => {
      try {
        const projectRoot = process.cwd();
        const metadata = await writeProjectMetadata(projectRoot, input);
        return {
          content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'task_checkbox_set',
    {
      description: 'Toggle one or more tasks.md completion checkboxes by task id',
      inputSchema: {
        ...taskIdentitySchema,
        taskIds: z.array(z.string().regex(/^T[0-9]+$/)).min(1),
        completed: z.boolean(),
      },
    },
    async ({ taskSpecId, slug, taskIds, completed }) => {
      try {
        const projectRoot = process.cwd();
        const result = await setTaskCheckboxes(projectRoot, taskSpecId, slug, taskIds, completed);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'step_init',
    {
      description: 'Initialize a workflow step with manifestos and before-hook instructions',
      inputSchema: {
        ...taskIdentitySchema,
        stepId: kebabCaseIdSchema,
      },
    },
    async ({ taskSpecId, slug, stepId }) => {
      try {
        const projectRoot = process.cwd();
        const result = await runStepInit(projectRoot, { taskSpecId, slug, stepId });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'step_finalize',
    {
      description: 'Finalize a workflow step after validation and return after-hook instructions',
      inputSchema: {
        ...taskIdentitySchema,
        stepId: kebabCaseIdSchema,
        validationPassed: z.boolean(),
      },
    },
    async ({ taskSpecId, slug, stepId, validationPassed }) => {
      try {
        const projectRoot = process.cwd();
        const result = await runStepFinalize(projectRoot, {
          taskSpecId,
          slug,
          stepId,
          validationPassed,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'step_output_instantiate',
    {
      description: 'Copy a toolkit step output template into the task spec directory',
      inputSchema: {
        ...taskIdentitySchema,
        stepId: kebabCaseIdSchema,
        frontmatter: z.record(z.unknown()).optional(),
      },
    },
    async ({ taskSpecId, slug, stepId, frontmatter }) => {
      try {
        const projectRoot = process.cwd();
        const relativePath = await instantiateStepOutput(projectRoot, taskSpecId, slug, stepId, {
          frontmatter,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ path: relativePath }, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'spec_frontmatter_update',
    {
      description: 'Merge non-status fields into spec.md YAML frontmatter',
      inputSchema: {
        ...taskIdentitySchema,
        fields: z.record(z.unknown()),
      },
    },
    async ({ taskSpecId, slug, fields }) => {
      try {
        const projectRoot = process.cwd();
        const frontmatter = await updateSpecFrontmatter(projectRoot, taskSpecId, slug, fields);
        return {
          content: [{ type: 'text', text: JSON.stringify(frontmatter, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'set_list_read',
    {
      description: 'Read set list configuration or one entry by id',
      inputSchema: {
        id: kebabCaseIdSchema.optional(),
      },
    },
    async ({ id }) => {
      try {
        const projectRoot = process.cwd();
        const result = await executeSetListRead(projectRoot, { id });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'set_list_triage',
    {
      description: 'Evaluate user intent against enabled set lists and select by priority',
      inputSchema: {
        userIntent: z.string().min(1),
        taskSpecId: taskSpecIdSchema.optional(),
        slug: kebabCaseIdSchema.optional(),
      },
    },
    async (input) => {
      try {
        const projectRoot = process.cwd();
        const result = await executeSetListTriage(projectRoot, input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'repository_workflow_types_list',
    {
      description: 'List repository onboarding and drift workflow type metadata',
      inputSchema: {},
    },
    async () => {
      try {
        const result = executeRepositoryWorkflowTypesList();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'repository_workflow_start',
    {
      description: 'Start a repository workflow and recommend a discovery plan',
      inputSchema: {
        workflowTypeId: repositoryWorkflowTypeIdSchema,
        description: z.string().optional(),
      },
    },
    async (input) => {
      try {
        const projectRoot = process.cwd();
        const result = await executeRepositoryWorkflowStart(projectRoot, input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'repository_workflow_plan',
    {
      description: 'Recommend a repository workflow discovery plan before analysis begins',
      inputSchema: {
        workflowTypeId: repositoryWorkflowTypeIdSchema,
        scope: repositoryWorkflowScopeSchema.optional(),
        bounds: discoveryPlanBoundsSchema.optional(),
      },
    },
    async (input) => {
      try {
        const projectRoot = process.cwd();
        const result = await executeRepositoryWorkflowPlan(projectRoot, input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'repository_workflow_drift_run',
    {
      description: 'Run repository drift through specify and produce refresh recommendations',
      inputSchema: {
        description: z.string().optional(),
      },
    },
    async (input) => {
      try {
        const projectRoot = process.cwd();
        const result = await executeRepositoryWorkflowDriftRun(projectRoot, input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'repository_workflow_report_read',
    {
      description: 'Read a repository workflow report artifact for a completed run',
      inputSchema: taskIdentitySchema,
    },
    async (input) => {
      try {
        const projectRoot = process.cwd();
        const result = await executeRepositoryWorkflowReportRead(projectRoot, input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: formatToolError(error) }], isError: true };
      }
    },
  );
}
