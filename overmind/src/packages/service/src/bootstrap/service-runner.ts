import { Command } from 'commander';
import { exit } from 'node:process';
import path from 'node:path';
import packageJson from '../../package.json';
import { buildOvermindRuntime } from './di-container.js';

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
    const runtime = buildOvermindRuntime(configDir);
    await runtime.server.listen();
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start service.';
    console.error(message);
    return 1;
  }
}
