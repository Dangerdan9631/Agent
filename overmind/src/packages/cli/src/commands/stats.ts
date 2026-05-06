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
      console.log(chalk.cyan(`Running cerebrates: ${stats.runningCerebrateCount}`));

      for (const cerebrate of stats.cerebrates) {
        console.log(
          chalk.cyan(
            `- ${cerebrate.name}: runtime ${cerebrate.runtime.toFixed(2)}s, idle loops ${cerebrate.idleLoopCount}`,
          ),
        );
      }
    });
}
