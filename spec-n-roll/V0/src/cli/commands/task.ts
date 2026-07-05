import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { TASK_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `task` command group and its subcommands.
 */
@injectable()
export class TaskCommand implements CliCommand {
  constructor(@injectAll(TASK_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const task = command.command('task').description('Task spec lifecycle and checkbox operations');
    for (const subcommand of this.subcommands) {
      subcommand.register(task);
    }
  }
}
