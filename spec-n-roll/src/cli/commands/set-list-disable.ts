import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { disableSetList } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list disable` CLI subcommand.
 */
@injectable()
export class SetListDisableCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('disable')
      .description('Disable a set list so it is excluded from triage')
      .argument('<id>', 'Set list id to disable')
      .action(async (id: string) => {
        try {
          const setListsFile = await disableSetList(process.cwd(), id);
          console.log(JSON.stringify({ setListsFile }, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
