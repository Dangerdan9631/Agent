import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { LIST_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `list` command group and its subcommands.
 */
@injectable()
export class ListCommand implements CliCommand {
  constructor(@injectAll(LIST_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const list = command.command('list').description('List toolkit resources');
    for (const subcommand of this.subcommands) {
      subcommand.register(list);
    }
  }
}
