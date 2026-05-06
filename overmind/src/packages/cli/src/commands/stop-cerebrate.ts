import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerStopCerebrate(program: Command, client: OvermindIpcClient): void {
  program
    .command('stop-cerebrate')
    .description('Stop a cerebrate state machine instance.')
    .argument('<name>', 'Cerebrate name.')
    .action(async (name: string) => {
      const result = await client.stopCerebrate({ name });
      console.log(result.stopped ? chalk.green(result.message) : chalk.yellow(result.message));
    });
}
