import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { validateSetListsFile } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list validate` CLI subcommand.
 */
@injectable()
export class SetListValidateCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('validate')
      .description('Validate set list references and enabled-count rules')
      .action(async () => {
        try {
          const result = await validateSetListsFile(process.cwd());
          console.log(JSON.stringify(result, null, 2));
          if (!result.valid) {
            process.exit(1);
          }
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
