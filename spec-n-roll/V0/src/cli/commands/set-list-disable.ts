import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { disableSetList } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list disable` CLI subcommand.
 */
@injectable()
export class SetListDisableCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('SetListDisableCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('disable')
      .description('Disable a set list so it is excluded from triage')
      .argument('<id>', 'Set list id to disable')
      .action(async (id: string) => {
        try {
          const setListsFile = await disableSetList(process.cwd(), id);
          this.output.info(JSON.stringify({ setListsFile }, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
