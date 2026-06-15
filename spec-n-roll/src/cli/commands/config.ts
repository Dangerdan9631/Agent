import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { CONFIG_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `config` command group and its subcommands.
 */
@injectable()
export class ConfigCommand implements CliCommand {
  constructor(@injectAll(CONFIG_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const config = command.command('config').description('Configure Spec-N-Roll project settings');
    for (const subcommand of this.subcommands) {
      subcommand.register(config);
    }
  }
}
