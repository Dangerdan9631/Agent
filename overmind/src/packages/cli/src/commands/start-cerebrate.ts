import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerStartCerebrate(program: Command, client: OvermindIpcClient): void {
  program
    .command('start-cerebrate')
    .description('Start a cerebrate instance by name.')
    .argument('<name>', 'Cerebrate name.')
    .action(async (name: string) => {
      const result = await client.startCerebrate({ name });
      console.log(chalk.green(`Cerebrate started: ${result.name}`));
    });
}
