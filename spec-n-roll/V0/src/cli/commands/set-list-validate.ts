import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { validateSetListsFile } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list validate` CLI subcommand.
 */
@injectable()
export class SetListValidateCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('SetListValidateCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('validate')
      .description('Validate set list references and enabled-count rules')
      .action(async () => {
        try {
          const result = await validateSetListsFile(process.cwd());
          this.output.info(JSON.stringify(result, null, 2));
          if (!result.valid) {
            process.exit(1);
          }
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
