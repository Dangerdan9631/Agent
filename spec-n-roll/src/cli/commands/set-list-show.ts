import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { loadSetListReadResult } from '../../sdk/set-list.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list show` CLI subcommand.
 */
@injectable()
export class SetListShowCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('SetListShowCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('show')
      .description('Show one set list entry as JSON')
      .argument('<id>', 'Set list id to load')
      .action(async (id: string) => {
        try {
          const result = await loadSetListReadResult(process.cwd(), { id });
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
