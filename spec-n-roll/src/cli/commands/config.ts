import { Command } from 'commander';

import { registerConfigAgentCommand } from './config-agent.js';

/**
 * Registers the `config` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerConfigCommand(program: Command): void {
  const config = program.command('config').description('Configure Spec-N-Roll project settings');

  registerConfigAgentCommand(config);
}
