import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { CoreMutationError } from '../core/errors.js';
import { updateSpecFrontmatter } from '../core/frontmatter.js';
import { readProjectMetadata, writeProjectMetadata } from '../core/project-metadata.js';
import { setTaskCheckboxes } from '../core/task-checkboxes.js';
import { setTaskSpecStatus } from '../core/task-lifecycle.js';
import { instantiateStepOutput } from '../core/templates.js';
import { readWorkflowState, writeWorkflowState } from '../core/workflow-state.js';
import { kebabCaseIdSchema, taskSpecIdSchema } from '../config/schema.js';

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
        const result = await setTaskCheckboxes(
          projectRoot,
          taskSpecId,
          slug,
          taskIds,
          completed,
        );
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
}
