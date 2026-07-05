import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { loadSetListReadResult } from '../../sdk/set-list.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list list` CLI subcommand.
 */
@injectable()
export class SetListListCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('SetListListCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('list')
      .description('List configured set lists as JSON')
      .option('--include-disabled', 'Include disabled set lists', true)
      .option('--exclude-disabled', 'Omit disabled set lists from the response')
      .action(async (options: { excludeDisabled?: boolean }) => {
        try {
          const result = await loadSetListReadResult(process.cwd(), {
            includeDisabled: options.excludeDisabled !== true,
          });
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
