import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { REPOSITORY_WORKFLOW_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `repository-workflow` command group and its subcommands.
 */
@injectable()
export class RepositoryWorkflowCommand implements CliCommand {
  constructor(
    @injectAll(REPOSITORY_WORKFLOW_SUBCOMMAND) private readonly subcommands: CliCommand[],
  ) {}

  register(command: Command): void {
    const repositoryWorkflow = command
      .command('repository-workflow')
      .description('Repository onboarding and drift workflow commands');
    for (const subcommand of this.subcommands) {
      subcommand.register(repositoryWorkflow);
    }
  }
}
