import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { TASK_STATUS_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `task status` command group and its subcommands.
 */
@injectable()
export class TaskStatusCommand implements CliCommand {
  constructor(@injectAll(TASK_STATUS_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const taskStatus = command.command('status').description('Task spec lifecycle status');
    for (const subcommand of this.subcommands) {
      subcommand.register(taskStatus);
    }
  }
}
