import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import {
  startRepositoryWorkflow,
  type StartRepositoryWorkflowResult,
} from '../../sdk/repository/workflow-run.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `repository-workflow start` CLI subcommand.
 */
@injectable()
export class RepositoryWorkflowStartCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('RepositoryWorkflowStartCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('start')
      .description('Start a repository workflow and recommend a discovery plan')
      .requiredOption(
        '--workflow-type-id <workflowTypeId>',
        'repository-onboarding or repository-drift',
      )
      .option('--description <description>', 'Maintainer-provided goal for the workflow run')
      .action(async (options: { workflowTypeId: string; description?: string }) => {
        try {
          const result: StartRepositoryWorkflowResult = await startRepositoryWorkflow({
            projectRoot: process.cwd(),
            workflowTypeId:
              options.workflowTypeId as StartRepositoryWorkflowResult['workflowTypeId'],
            description: options.description,
          });
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
