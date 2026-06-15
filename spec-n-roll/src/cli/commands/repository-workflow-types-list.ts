import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { loadRepositoryWorkflowTypesResult } from '../../sdk/repository-workflow.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `repository-workflow types list` CLI subcommand.
 */
@injectable()
export class RepositoryWorkflowTypesListCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('list')
      .description('List repository workflow types as JSON')
      .action(() => {
        try {
          const result = loadRepositoryWorkflowTypesResult();
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
