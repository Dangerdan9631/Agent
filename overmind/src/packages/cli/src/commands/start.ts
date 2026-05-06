import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerStart(program: Command, client: OvermindIpcClient): void {
  program
    .command('start')
    .description('Start the service process.')
    .requiredOption('--config-dir <path>', 'Path to Overmind configuration directory.')
    .action(async function (this: Command) {
      const opts = this.opts<{ configDir: string }>();
      const result = await client.startService({ configDir: opts.configDir });
      console.log(result.started ? chalk.green(result.message) : chalk.yellow(result.message));
    });
}
