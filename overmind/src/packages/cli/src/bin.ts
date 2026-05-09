#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'node:path';
import packageJson from '../package.json';
import { OvermindIpcClient } from './client.js';
import { registerAttach } from './commands/attach.js';
import { registerShutdown } from './commands/shutdown.js';
import { registerSendCommand } from './commands/send-command.js';
import { registerStart } from './commands/start.js';
import { registerStartCerebrate } from './commands/start-cerebrate.js';
import { registerStats } from './commands/stats.js';
import { registerStopCerebrate } from './commands/stop-cerebrate.js';

type GlobalOptions = {
  configDir?: string;
};

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('overmind')
    .description('Control the Overmind scaffold service.')
    .version(packageJson.version)
    .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR']);

  // Pre-parse to extract the global --config-dir before subcommands consume argv.
  program.parseOptions(process.argv.slice(2));
  const opts = program.opts<GlobalOptions>();
  if (!opts.configDir) {
    console.error(chalk.red('Missing required option: --config-dir <path> (or set OVERMIND_CONFIG_DIR)'));
    process.exitCode = 1;
    return;
  }

  const configDir = path.resolve(opts.configDir);
  const client = new OvermindIpcClient(configDir);

  registerStart(program, client);
  registerStartCerebrate(program, client);
  registerStats(program, client);
  registerStopCerebrate(program, client);
  registerSendCommand(program, client);
  registerAttach(program, client);
  registerShutdown(program, client);

  await program.parseAsync(process.argv);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected CLI error.';
  console.error(chalk.red(message));
  process.exitCode = 1;
});
