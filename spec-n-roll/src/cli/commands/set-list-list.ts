import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { loadSetListReadResult } from '../../sdk/set-list.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list list` CLI subcommand.
 */
@injectable()
export class SetListListCommand implements CliCommand {
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
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
