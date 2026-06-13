import { Command } from 'commander';

import { registerListAgentsCommand } from './list-agents.js';

/**
 * Registers the `list` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerListCommand(program: Command): void {
  const list = program.command('list').description('List toolkit resources');

  registerListAgentsCommand(list);
}
