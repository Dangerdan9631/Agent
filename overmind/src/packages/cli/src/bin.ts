#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import packageJson from '../package.json';
import { OvermindIpcClient } from './client.js';
import { registerShutdown } from './commands/shutdown.js';
import { registerStart } from './commands/start.js';
import { registerStats } from './commands/stats.js';

async function main(): Promise<void> {
  const program = new Command();
  const client = new OvermindIpcClient();

  program
    .name('overmind')
    .description('Control the Overmind scaffold service.')
    .version(packageJson.version);

  registerStart(program, client);
  registerStats(program, client);
  registerShutdown(program, client);

  await program.parseAsync(process.argv);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected CLI error.';
  console.error(chalk.red(message));
  process.exitCode = 1;
});
