import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerAttach(program: Command, client: OvermindIpcClient): void {
  program
    .command('attach')
    .description('Attach to a running cerebrate output stream until the connection closes.')
    .argument('<name>', 'Cerebrate name.')
    .action(async (name: string) => {
      try {
        await client.attachCerebrate(name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(message));
        process.exitCode = 1;
      }
    });
}
