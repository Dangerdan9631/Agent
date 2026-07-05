import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import {
  runRepositoryDriftWorkflow,
  type RepositoryDriftWorkflowResult,
} from '../../sdk/repository/workflow-run.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `repository-workflow drift run` CLI subcommand.
 */
@injectable()
export class RepositoryWorkflowDriftRunCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('RepositoryWorkflowDriftRunCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('run')
      .description('Run repository drift through specify and produce refresh recommendations')
      .option('--description <description>', 'Maintainer-provided goal for the drift run')
      .action(async (options: { description?: string }) => {
        try {
          const result: RepositoryDriftWorkflowResult = await runRepositoryDriftWorkflow({
            projectRoot: process.cwd(),
            description: options.description,
          });
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
