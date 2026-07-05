import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { CONFIG_AGENT_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `config agent` command group and its subcommands.
 */
@injectable()
export class ConfigAgentCommand implements CliCommand {
  constructor(@injectAll(CONFIG_AGENT_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const agent = command.command('agent').description('Manage configured AI coding agents');
    for (const subcommand of this.subcommands) {
      subcommand.register(agent);
    }
  }
}
