import { Command } from 'commander';

import { resolveTaskSpecSlug } from '../../core/task-lifecycle.js';
import { writeWorkflowState } from '../../core/workflow-state.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers the `workflow state write` subcommand on the workflow state command group.
 *
 * @param state - Commander `workflow state` command to attach the subcommand to.
 */
export function registerWorkflowStateWriteCommand(state: Command): void {
  state
    .command('write')
    .description('Write workflow state for a task spec')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption(
      '--workflow-variant-id <id>',
      'Set list id (stored as workflowVariantId in workflow-state.json)',
    )
    .option('--last-completed-step-id <id>', 'Last completed step id')
    .option('--current-step-id <id>', 'Current in-progress step id')
    .requiredOption('--status <status>', 'Operational status: active|paused|complete')
    .action(
      async (options: {
        taskSpecId: string;
        workflowVariantId: string;
        lastCompletedStepId?: string;
        currentStepId?: string;
        status: 'active' | 'paused' | 'complete';
      }) => {
        try {
          const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
          const result = await writeWorkflowState(process.cwd(), {
            taskSpecId: options.taskSpecId,
            slug,
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
}
