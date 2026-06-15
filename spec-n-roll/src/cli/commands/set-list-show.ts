import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { loadSetListReadResult } from '../../sdk/set-list.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list show` CLI subcommand.
 */
@injectable()
export class SetListShowCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('show')
      .description('Show one set list entry as JSON')
      .argument('<id>', 'Set list id to load')
      .action(async (id: string) => {
        try {
          const result = await loadSetListReadResult(process.cwd(), { id });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
