import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { resolveTaskSpecSlug, setTaskSpecStatus } from '../../sdk/core/task-lifecycle.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `task status set` CLI subcommand.
 */
@injectable()
export class TaskStatusSetCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('TaskStatusSetCommand', { plain: true });
  }

  register(command: Command): void {
    command
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
            this.output.error('status must be Active, Complete, or Locked');
            process.exit(1);
          }
          try {
            const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
            const result = await setTaskSpecStatus(process.cwd(), options.taskSpecId, slug, status);
            this.output.info(JSON.stringify(result, null, 2));
          } catch (error) {
            exitOnCoreError(error, this.output);
          }
        },
      );
  }
}
