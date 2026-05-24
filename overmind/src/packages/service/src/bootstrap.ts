import { Command } from 'commander';
import { exit } from 'node:process';
import path from 'node:path';
import packageJson from '../package.json';
import { container, type DependencyContainer } from 'tsyringe';
import { loadCerebrateConfig, loadOvermindConfig, OvermindConfigToken } from '@overmind/config';
import { getOvermindPipePath, LoggerFactory, LoggerFactoryToken } from 'overmind-core';
import { LlmChain, createLlmChain } from './llm/index.js';
import { BufferedLoggerFactory } from './logging/index.js';
import { OvermindServer, OvermindService } from './service/index.js';

type ServiceOptions = {
  configDir?: string;
};

function createProgram(): Command {
  return new Command()
    .name('overmind-service')
    .description('Run the Overmind service.')
    .version(packageJson.version)
    .argument('[config-dir]', 'Path to the Overmind service configuration directory.')
    .option('--config-dir <path>', 'Path to the Overmind service configuration directory.');
}

export function buildServiceContainer(configDir: string): DependencyContainer {
  const child = container.createChildContainer();
  const overmindConfig = loadOvermindConfig(configDir);

  child.register(OvermindConfigToken, { useValue: overmindConfig });
  child.register(LlmChain, { useValue: createLlmChain(overmindConfig.llm) });
  child.register(LoggerFactoryToken, { useClass: BufferedLoggerFactory });

  return child;
}

export function resolveServiceConfigDir(argv: string[]): string {
  const program = createProgram();
  program.parse(argv);

  const options = program.opts<ServiceOptions>();
  const positionalConfigDir = program.args[0] as string | undefined;
  const configDirArg = options.configDir ?? positionalConfigDir;

  if (configDirArg === undefined) {
    program.error('Missing required argument: config-dir');
    exit(1);
  }

  return path.resolve(configDirArg);
}

export async function runOvermindService(argv: string[]): Promise<number> {
  try {
    const configDir = resolveServiceConfigDir(argv);

    // Scaffold the default 'hello' cerebrate definition if it doesn't exist yet.
    const helloDir = path.join(configDir, 'cerebrates', 'hello');
    loadCerebrateConfig(helloDir, true);

    const di = buildServiceContainer(configDir);
    const service = di.resolve(OvermindService);
    const loggerFactory = di.resolve(LoggerFactoryToken) as LoggerFactory;
    const server = new OvermindServer(getOvermindPipePath(configDir), service, loggerFactory);

    await server.start();
    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start service.';
    console.error(message);
    return 1;
  }
}