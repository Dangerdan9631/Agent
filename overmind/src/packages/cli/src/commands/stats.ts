import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerStats(program: Command, client: OvermindIpcClient): void {
  program
    .command('stats')
    .description('Request service runtime statistics.')
    .action(async () => {
      const stats = await client.getServiceStats({});
      console.log(chalk.cyan(`Uptime: ${stats.uptime.toFixed(2)}s`));
    });
}
