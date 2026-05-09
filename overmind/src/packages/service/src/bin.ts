#!/usr/bin/env node
import 'reflect-metadata';
import { Command } from 'commander';
import path from 'node:path';
import packageJson from '../package.json';
import { container, type DependencyContainer } from 'tsyringe';
import { createLlmChain, LlmChain } from './llm/index.js';
import { loadCerebrateConfig, loadOvermindConfig, OvermindConfigToken } from '@overmind/config';
import { OvermindService } from '@overmind/service';
import { exit } from 'node:process';

type ServiceOptions = {
  configDir?: string;
};

const program = new Command()
  .name('overmind-service')
  .description('Run the Overmind service.')
  .version(packageJson.version)
  .argument('[config-dir]', 'Path to the Overmind service configuration directory.')
  .option('--config-dir <path>', 'Path to the Overmind service configuration directory.');

function buildContainer(configDir: string): DependencyContainer {
  const child = container.createChildContainer();
  const overmindConfig = loadOvermindConfig(configDir);
  child.register(OvermindConfigToken, { useValue: overmindConfig });
  child.register(LlmChain, { useValue: createLlmChain(overmindConfig.llm) });
  return child;
}

try {
  program.parse(process.argv);
  
  const options = program.opts<ServiceOptions>();
  const positionalConfigDir = program.args[0] as string | undefined;
  const configDirArg = options.configDir ?? positionalConfigDir;
  if (configDirArg === undefined) {
    program.error('Missing required argument: config-dir');
    exit(1);
  }

  const configDir = path.resolve(configDirArg);
  
  // Scaffold the default 'hello' cerebrate definition if it doesn't exist yet.
  const helloDir = path.join(configDir, 'cerebrates', 'hello');
  loadCerebrateConfig(helloDir, true);

  const di = buildContainer(configDir);
  const server = di.resolve(OvermindService);
  await server.start();
} catch(error: unknown) {
  const message = error instanceof Error ? error.message : 'Failed to start service.';
  console.error(message);
  exit(1);
}
