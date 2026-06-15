import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { removeSetList } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list remove` CLI subcommand.
 */
@injectable()
export class SetListRemoveCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('SetListRemoveCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('remove')
      .description('Remove a set list entry from the project configuration')
      .argument('<id>', 'Set list id to remove')
      .action(async (id: string) => {
        try {
          const setListsFile = await removeSetList(process.cwd(), id);
          this.output.info(JSON.stringify({ setListsFile }, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
