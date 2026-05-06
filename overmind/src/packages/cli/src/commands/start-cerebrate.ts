import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerStartCerebrate(program: Command, client: OvermindIpcClient): void {
  program
    .command('start-cerebrate')
    .description('Start a cerebrate state machine instance.')
    .action(async () => {
      const result = await client.startCerebrate({});
      console.log(chalk.green(`Cerebrate started: ${result.id}`));
    });
}
