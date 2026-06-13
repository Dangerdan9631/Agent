import { Command } from 'commander';

import { resolveTaskSpecSlug, setTaskSpecStatus } from '../../core/task-lifecycle.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers the `task status set` subcommand on the task status command group.
 *
 * @param taskStatus - Commander `task status` command to attach the subcommand to.
 */
export function registerTaskStatusSetCommand(taskStatus: Command): void {
  taskStatus
    .command('set')
    .description('Set task spec lifecycle status in spec.md frontmatter')
    .argument('<status>', 'Active|Complete|Locked')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .action(
      async (
        status: string,
        options: {
          taskSpecId: string;
        },
      ) => {
        if (status !== 'Active' && status !== 'Complete' && status !== 'Locked') {
          console.error('status must be Active, Complete, or Locked');
          process.exit(1);
        }
        try {
          const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
          const result = await setTaskSpecStatus(process.cwd(), options.taskSpecId, slug, status);
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );
}
