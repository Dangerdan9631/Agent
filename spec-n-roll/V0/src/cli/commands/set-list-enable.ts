import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { enableSetList } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list enable` CLI subcommand.
 */
@injectable()
export class SetListEnableCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('SetListEnableCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('enable')
      .description('Enable a set list for triage evaluation')
      .argument('<id>', 'Set list id to enable')
      .action(async (id: string) => {
        try {
          const setListsFile = await enableSetList(process.cwd(), id);
          this.output.info(JSON.stringify({ setListsFile }, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
