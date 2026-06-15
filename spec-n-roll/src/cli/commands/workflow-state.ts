import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { WORKFLOW_STATE_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `workflow state` command group and its subcommands.
 */
@injectable()
export class WorkflowStateCommand implements CliCommand {
  constructor(@injectAll(WORKFLOW_STATE_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const state = command
      .command('state')
      .description('Read and write workflow-state.json for a task spec');
    for (const subcommand of this.subcommands) {
      subcommand.register(state);
    }
  }
}
