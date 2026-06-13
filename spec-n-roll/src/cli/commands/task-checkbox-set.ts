import { Command } from 'commander';

import { setTaskCheckboxes } from '../../core/task-checkboxes.js';
import { resolveTaskSpecSlug } from '../../core/task-lifecycle.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers the `task checkbox set` subcommand on the task checkbox command group.
 *
 * @param taskCheckbox - Commander `task checkbox` command to attach the subcommand to.
 */
export function registerTaskCheckboxSetCommand(taskCheckbox: Command): void {
  taskCheckbox
    .command('set')
    .description('Toggle one or more tasks.md checkboxes by task id')
    .argument('<completed>', 'true or false')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption('--task-id <ids...>', 'One or more task ids (e.g. T042 T043)')
    .action(
      async (
        completed: string,
        options: {
          taskSpecId: string;
          taskId: string[];
        },
      ) => {
        if (completed !== 'true' && completed !== 'false') {
          console.error('completed must be true or false');
          process.exit(1);
        }
        try {
          const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
          const result = await setTaskCheckboxes(
            process.cwd(),
            options.taskSpecId,
            slug,
            options.taskId,
            completed === 'true',
          );
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );
}
