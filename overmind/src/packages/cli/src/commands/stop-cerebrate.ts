import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerStopCerebrate(program: Command, client: OvermindIpcClient): void {
  program
    .command('stop-cerebrate')
    .description('Stop a cerebrate state machine instance.')
    .argument('<id>', 'Cerebrate ID to stop.')
    .action(async (id: string) => {
      const result = await client.stopCerebrate({ id });
      console.log(result.stopped ? chalk.green(result.message) : chalk.yellow(result.message));
    });
}
