import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { loadRepositoryWorkflowReportReadResult } from '../../sdk/repository-workflow.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `repository-workflow report read` CLI subcommand.
 */
@injectable()
export class RepositoryWorkflowReportReadCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('RepositoryWorkflowReportReadCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('read')
      .description('Read a repository workflow report artifact as JSON')
      .requiredOption('--task-spec-id <id>', 'Numeric task spec id (e.g. 001)')
      .action(async (options: { taskSpecId: string }) => {
        try {
          const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
          const result = await loadRepositoryWorkflowReportReadResult(
            process.cwd(),
            options.taskSpecId,
            slug,
          );
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
