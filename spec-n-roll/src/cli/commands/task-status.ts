import { Command } from 'commander';

import { registerTaskStatusSetCommand } from './task-status-set.js';

/**
 * Registers the `task status` command group and its subcommands.
 *
 * @param task - Commander `task` command to attach the group to.
 */
export function registerTaskStatusCommand(task: Command): void {
  const taskStatus = task.command('status').description('Task spec lifecycle status');

  registerTaskStatusSetCommand(taskStatus);
}
