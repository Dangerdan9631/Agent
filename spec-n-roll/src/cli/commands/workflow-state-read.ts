import { Command } from 'commander';

import { resolveTaskSpecSlug } from '../../core/task-lifecycle.js';
import { readWorkflowState } from '../../core/workflow-state.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers the `workflow state read` subcommand on the workflow state command group.
 *
 * @param state - Commander `workflow state` command to attach the subcommand to.
 */
export function registerWorkflowStateReadCommand(state: Command): void {
  state
    .command('read')
    .description('Read workflow state for a task spec')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id (e.g. 001)')
    .action(async (options: { taskSpecId: string }) => {
      try {
        const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
        const result = await readWorkflowState(process.cwd(), options.taskSpecId, slug);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}
