import { Command } from 'commander';

import { updateSpecFrontmatter } from '../../core/frontmatter.js';
import { readProjectMetadata, writeProjectMetadata } from '../../core/project-metadata.js';
import { setTaskCheckboxes } from '../../core/task-checkboxes.js';
import { setTaskSpecStatus } from '../../core/task-lifecycle.js';
import { instantiateStepOutput } from '../../core/templates.js';
import { readWorkflowState, writeWorkflowState } from '../../core/workflow-state.js';

/**
 * Prints a core mutation error to stderr and exits with code 1.
 *
 * @param error - Error thrown from a core-library operation.
 */
function exitOnCoreError(error: unknown): never {
  if (error instanceof Error) {
    console.error(error.message);
    process.exit(1);
  }
  console.error(String(error));
  process.exit(1);
}

/**
 * Parses repeated `key=value` CLI arguments into an object map.
 *
 * @param pairs - Raw key=value strings from Commander.
 * @returns Parsed key-value map.
 */
function parseKeyValuePairs(pairs: string[] | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const pair of pairs ?? []) {
    const index = pair.indexOf('=');
    if (index === -1) {
      throw new Error(`Invalid pair "${pair}"; expected key=value`);
    }
    result[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return result;
}

/**
 * Registers non-interactive core-library CLI subcommands matching MCP tools.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerCoreCommands(program: Command): void {
  const workflow = program.command('workflow').description('Workflow state operations');
  const state = workflow.command('state').description('workflow-state.json read/write');

  state
    .command('read')
    .description('Read workflow state for a task spec')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id (e.g. 001)')
    .requiredOption('--slug <slug>', 'Task spec slug')
    .action(async (options: { taskSpecId: string; slug: string }) => {
      const result = await readWorkflowState(process.cwd(), options.taskSpecId, options.slug);
      console.log(JSON.stringify(result, null, 2));
    });

  state
    .command('write')
    .description('Write workflow state for a task spec')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption('--slug <slug>', 'Task spec slug')
    .requiredOption('--workflow-variant-id <id>', 'Workflow variant id')
    .option('--last-completed-step-id <id>', 'Last completed step id')
    .option('--current-step-id <id>', 'Current in-progress step id')
    .requiredOption('--status <status>', 'Operational status: active|paused|complete')
    .action(
      async (options: {
        taskSpecId: string;
        slug: string;
        workflowVariantId: string;
        lastCompletedStepId?: string;
        currentStepId?: string;
        status: 'active' | 'paused' | 'complete';
      }) => {
        try {
          const result = await writeWorkflowState(process.cwd(), {
            taskSpecId: options.taskSpecId,
            slug: options.slug,
            workflowVariantId: options.workflowVariantId,
            lastCompletedStepId: options.lastCompletedStepId ?? null,
            currentStepId: options.currentStepId ?? null,
            status: options.status,
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );

  const task = program.command('task').description('Task spec lifecycle and checkbox operations');
  const taskStatus = task.command('status').description('Task spec lifecycle status');
  taskStatus
    .command('set')
    .description('Set task spec lifecycle status in spec.md frontmatter')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption('--slug <slug>', 'Task spec slug')
    .requiredOption('--status <status>', 'Active|Complete|Locked')
    .action(
      async (options: {
        taskSpecId: string;
        slug: string;
        status: 'Active' | 'Complete' | 'Locked';
      }) => {
        try {
          const result = await setTaskSpecStatus(
            process.cwd(),
            options.taskSpecId,
            options.slug,
            options.status,
          );
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );

  const taskCheckbox = task.command('checkbox').description('tasks.md checkbox toggles');
  taskCheckbox
    .command('set')
    .description('Toggle one or more tasks.md checkboxes by task id')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption('--slug <slug>', 'Task spec slug')
    .requiredOption('--task-id <ids...>', 'One or more task ids (e.g. T042 T043)')
    .requiredOption('--completed <value>', 'true or false')
    .action(
      async (options: {
        taskSpecId: string;
        slug: string;
        taskId: string[];
        completed: string;
      }) => {
        if (options.completed !== 'true' && options.completed !== 'false') {
          console.error('--completed must be true or false');
          process.exit(1);
        }
        try {
          const result = await setTaskCheckboxes(
            process.cwd(),
            options.taskSpecId,
            options.slug,
            options.taskId,
            options.completed === 'true',
          );
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );

  const project = program.command('project').description('Project metadata operations');
  const metadata = project.command('metadata').description('project-metadata.json read/write');

  metadata
    .command('read')
    .description('Read project-metadata.json')
    .action(async () => {
      const result = await readProjectMetadata(process.cwd());
      console.log(JSON.stringify(result, null, 2));
    });

  metadata
    .command('write')
    .description('Update project-metadata.json fields')
    .option('--next-task-spec-id <n>', 'Next task spec id counter', (value) => Number(value))
    .option('--current-task-spec-id <id>', 'Current implementation task spec id')
    .option('--current-task-slug <slug>', 'Current implementation task slug')
    .option('--implementation-started-at <iso>', 'Implementation start timestamp')
    .action(
      async (options: {
        nextTaskSpecId?: number;
        currentTaskSpecId?: string;
        currentTaskSlug?: string;
        implementationStartedAt?: string;
      }) => {
        try {
          const result = await writeProjectMetadata(process.cwd(), {
            nextTaskSpecId: options.nextTaskSpecId,
            currentTaskSpecId: options.currentTaskSpecId ?? undefined,
            currentTaskSlug: options.currentTaskSlug ?? undefined,
            implementationStartedAt: options.implementationStartedAt ?? undefined,
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );

  const step = program.command('step').description('Step output template operations');
  step
    .command('instantiate')
    .description('Instantiate a step output template into a task spec directory')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption('--slug <slug>', 'Task spec slug')
    .requiredOption('--step-id <id>', 'Step id: specify|plan|tasks')
    .option('--frontmatter <pair...>', 'Frontmatter key=value pairs for spec.md')
    .action(
      async (options: {
        taskSpecId: string;
        slug: string;
        stepId: string;
        frontmatter?: string[];
      }) => {
        try {
          const relativePath = await instantiateStepOutput(
            process.cwd(),
            options.taskSpecId,
            options.slug,
            options.stepId,
            { frontmatter: parseKeyValuePairs(options.frontmatter) },
          );
          console.log(JSON.stringify({ path: relativePath }, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );

  const spec = program.command('spec').description('spec.md frontmatter operations');
  const frontmatter = spec.command('frontmatter').description('Non-status frontmatter updates');
  frontmatter
    .command('update')
    .description('Merge non-status fields into spec.md frontmatter')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption('--slug <slug>', 'Task spec slug')
    .option('--field <pair...>', 'Frontmatter key=value pairs')
    .action(async (options: { taskSpecId: string; slug: string; field?: string[] }) => {
      try {
        const fields = parseKeyValuePairs(options.field);
        const result = await updateSpecFrontmatter(
          process.cwd(),
          options.taskSpecId,
          options.slug,
          fields,
        );
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}
