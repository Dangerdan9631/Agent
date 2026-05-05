import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerStart(program: Command, client: OvermindIpcClient): void {
  program
    .command('start')
    .description('Start the service process.')
    .action(async () => {
      const result = await client.startService({});
      console.log(result.started ? chalk.green(result.message) : chalk.yellow(result.message));
    });
}
