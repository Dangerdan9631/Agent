import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { TASK_CHECKBOX_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `task checkbox` command group and its subcommands.
 */
@injectable()
export class TaskCheckboxCommand implements CliCommand {
  constructor(@injectAll(TASK_CHECKBOX_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const taskCheckbox = command.command('checkbox').description('tasks.md checkbox toggles');
    for (const subcommand of this.subcommands) {
      subcommand.register(taskCheckbox);
    }
  }
}
