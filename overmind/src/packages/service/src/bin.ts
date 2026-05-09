#!/usr/bin/env node
import 'reflect-metadata';
import { Command } from 'commander';
import path from 'node:path';
import packageJson from '../package.json';
import { runOvermindService } from './service/run-service.js';

type ServiceOptions = {
  configDir?: string;
};

async function main(): Promise<void> {
  const program = new Command()
    .name('overmind-service')
    .description('Run the Overmind service.')
    .version(packageJson.version)
    .argument('[config-dir]', 'Path to the Overmind service configuration directory.')
    .option('--config-dir <path>', 'Path to the Overmind service configuration directory.');
  program.parse(process.argv);

  const options = program.opts<ServiceOptions>();
  const positionalConfigDir = program.args[0] as string | undefined;
  const configDirArg = options.configDir ?? positionalConfigDir;
  if (configDirArg === undefined) {
    program.error('Missing required argument: config-dir');
    return;
  }

  const configDir = path.resolve(configDirArg);
  await runOvermindService({ configDir });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to start service.';
  console.error(message);
  process.exitCode = 1;
});
