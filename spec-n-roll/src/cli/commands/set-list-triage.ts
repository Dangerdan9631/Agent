import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { runSetListTriage } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `set-list triage` CLI subcommand.
 */
@injectable()
export class SetListTriageCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('triage')
      .description('Evaluate user intent against enabled set lists')
      .requiredOption('--intent <text>', 'Natural-language description of the work')
      .action(async (options: { intent: string }) => {
        try {
          const result = await runSetListTriage(process.cwd(), options.intent);
          console.log(JSON.stringify(result, null, 2));
          if (result.blocking) {
            process.exit(1);
          }
        } catch (error) {
          exitOnCoreError(error);
        }
      });
  }
}
