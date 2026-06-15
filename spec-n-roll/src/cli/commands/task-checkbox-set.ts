import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { setTaskCheckboxes } from '../../sdk/core/task-checkboxes.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `task checkbox set` CLI subcommand.
 */
@injectable()
export class TaskCheckboxSetCommand implements CliCommand {
  register(command: Command): void {
    command
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
}
