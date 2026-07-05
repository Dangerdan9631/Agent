import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { WORKFLOW_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `workflow` command group and its subcommands.
 */
@injectable()
export class WorkflowCommand implements CliCommand {
  constructor(@injectAll(WORKFLOW_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const workflow = command.command('workflow').description('Workflow state operations');
    for (const subcommand of this.subcommands) {
      subcommand.register(workflow);
    }
  }
}
