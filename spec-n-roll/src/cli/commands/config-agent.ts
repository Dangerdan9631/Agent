import { Command } from 'commander';

import { registerConfigAgentAddCommand } from './config-agent-add.js';
import { registerConfigAgentRemoveCommand } from './config-agent-remove.js';

/**
 * Registers the `config agent` command group and its subcommands.
 *
 * @param config - Commander `config` command to attach the group to.
 */
export function registerConfigAgentCommand(config: Command): void {
  const agent = config.command('agent').description('Manage configured AI coding agents');

  registerConfigAgentAddCommand(agent);
  registerConfigAgentRemoveCommand(agent);
}
