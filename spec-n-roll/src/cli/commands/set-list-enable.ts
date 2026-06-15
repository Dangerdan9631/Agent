import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { enableSetList } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list enable` CLI subcommand.
 */
@injectable()
export class SetListEnableCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('enable')
      .description('Enable a set list for triage evaluation')
      .argument('<id>', 'Set list id to enable')
      .action(async (id: string) => {
        try {
          const setListsFile = await enableSetList(process.cwd(), id);
          console.log(JSON.stringify({ setListsFile }, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
