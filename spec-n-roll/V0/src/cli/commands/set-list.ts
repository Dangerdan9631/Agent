import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { SET_LIST_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `set-list` command group and its subcommands.
 */
@injectable()
export class SetListCommand implements CliCommand {
  constructor(@injectAll(SET_LIST_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const setList = command
      .command('set-list')
      .description('Configure set lists that drive workflow triage');
    for (const subcommand of this.subcommands) {
      subcommand.register(setList);
    }
  }
}
