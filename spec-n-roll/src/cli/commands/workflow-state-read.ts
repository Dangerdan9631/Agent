import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import { readWorkflowState } from '../../sdk/core/workflow-state.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `workflow state read` CLI subcommand.
 */
@injectable()
export class WorkflowStateReadCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('WorkflowStateReadCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('read')
      .description('Read workflow state for a task spec')
      .requiredOption('--task-spec-id <id>', 'Numeric task spec id (e.g. 001)')
      .action(async (options: { taskSpecId: string }) => {
        try {
          const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
          const result = await readWorkflowState(process.cwd(), options.taskSpecId, slug);
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
