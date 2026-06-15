import { Command } from 'commander';
import { injectable } from 'tsyringe';

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
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
