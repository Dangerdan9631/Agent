import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerShutdown(program: Command, client: OvermindIpcClient): void {
  program
    .command('shutdown')
    .description('Request service shutdown.')
    .action(async () => {
      const result = await client.shutdown({});
      console.log(chalk.green(result.message));
    });
}
