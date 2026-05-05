#!/usr/bin/env node
import { Command } from 'commander';
import packageJson from '../package.json';
import { OvermindIpcClient } from './client.js';
import { startOvermindService } from './start-service.js';

async function getChalk() {
  return (await import('chalk')).default;
}

async function main(): Promise<void> {
  const chalk = await getChalk();
  const program = new Command();
  const client = new OvermindIpcClient();

  program
    .name('overmind')
    .description('Control the Overmind scaffold service.')
    .version(packageJson.version);

  program
    .command('start')
    .description('Start the service process.')
    .action(async () => {
      const result = await startOvermindService(client);
      console.log(result.started ? chalk.green(result.message) : chalk.yellow(result.message));
    });

  program
    .command('stats')
    .description('Request service runtime statistics.')
    .action(async () => {
      const stats = await client.getServiceStats({});
      console.log(chalk.cyan(`Uptime: ${stats.uptime.toFixed(2)}s`));
    });

  program
    .command('shutdown')
    .description('Request service shutdown.')
    .action(async () => {
      const result = await client.shutdown({});
      console.log(chalk.green(result.message));
    });

  await program.parseAsync(process.argv);
}

void main().catch((error: unknown) => {
  void (async () => {
    const chalk = await getChalk();
    const message = error instanceof Error ? error.message : 'Unexpected CLI error.';
    console.error(chalk.red(message));
    process.exitCode = 1;
  })();
});