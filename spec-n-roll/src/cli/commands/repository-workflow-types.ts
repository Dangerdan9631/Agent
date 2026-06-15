import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { REPOSITORY_WORKFLOW_TYPES_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `repository-workflow types` command group and its subcommands.
 */
@injectable()
export class RepositoryWorkflowTypesCommand implements CliCommand {
  constructor(
    @injectAll(REPOSITORY_WORKFLOW_TYPES_SUBCOMMAND) private readonly subcommands: CliCommand[],
  ) {}

  register(command: Command): void {
    const types = command.command('types').description('Repository workflow type commands');
    for (const subcommand of this.subcommands) {
      subcommand.register(types);
    }
  }
}
