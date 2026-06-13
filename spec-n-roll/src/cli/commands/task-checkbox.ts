import { Command } from 'commander';

import { registerTaskCheckboxSetCommand } from './task-checkbox-set.js';

/**
 * Registers the `task checkbox` command group and its subcommands.
 *
 * @param task - Commander `task` command to attach the group to.
 */
export function registerTaskCheckboxCommand(task: Command): void {
  const taskCheckbox = task.command('checkbox').description('tasks.md checkbox toggles');

  registerTaskCheckboxSetCommand(taskCheckbox);
}
