import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { removeSetList } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list remove` CLI subcommand.
 */
@injectable()
export class SetListRemoveCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('remove')
      .description('Remove a set list entry from the project configuration')
      .argument('<id>', 'Set list id to remove')
      .action(async (id: string) => {
        try {
          const setListsFile = await removeSetList(process.cwd(), id);
          console.log(JSON.stringify({ setListsFile }, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
