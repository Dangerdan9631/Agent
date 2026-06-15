import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { REPOSITORY_WORKFLOW_DRIFT_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `repository-workflow drift` command group and its subcommands.
 */
@injectable()
export class RepositoryWorkflowDriftCommand implements CliCommand {
  constructor(
    @injectAll(REPOSITORY_WORKFLOW_DRIFT_SUBCOMMAND) private readonly subcommands: CliCommand[],
  ) {}

  register(command: Command): void {
    const drift = command.command('drift').description('Repository drift workflow commands');
    for (const subcommand of this.subcommands) {
      subcommand.register(drift);
    }
  }
}
