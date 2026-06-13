import { Command } from 'commander';

import { registerTaskCheckboxCommand } from './task-checkbox.js';
import { registerTaskStatusCommand } from './task-status.js';

/**
 * Registers the `task` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerTaskCommand(program: Command): void {
  const task = program.command('task').description('Task spec lifecycle and checkbox operations');

  registerTaskStatusCommand(task);
  registerTaskCheckboxCommand(task);
}
