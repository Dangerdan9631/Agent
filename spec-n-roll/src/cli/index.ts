#!/usr/bin/env node

import '../di/bootstrap.js';

import { rootContainer } from '../di/container.js';
import { LOGGER_FACTORY } from '../di/tokens.js';
import { isCurrentModuleEntrypoint } from '../sdk/core/paths.js';
import { CliProgramFactory } from './cli-program-factory.js';
import { stripGlobalFlag } from './dispatcher.js';
import { launchInteractiveApp } from './interactive/launch.js';
import { argvRequestsVersion, printVersionReport } from './version-invocation.js';

/**
 * Determines whether stripped command arguments should enter the interactive app.
 *
 * @param args - Command arguments after global flag handling.
 * @returns True when the full CLI was invoked without a subcommand or option.
 */
export function shouldLaunchInteractiveApp(args: readonly string[]): boolean {
  return args.length === 0;
}

/**
 * Entry point for the full CLI binary that parses subcommands and options.
 *
 * @param argv - The command line arguments to parse.
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  const rawArgs = argv.slice(2);
  const { args } = stripGlobalFlag(rawArgs);

  if (argvRequestsVersion(args)) {
    const loggerFactory = rootContainer.resolve(LOGGER_FACTORY);
    const logger = loggerFactory.create('version', { plain: true });
    printVersionReport(logger, { executedBinaryPath: argv[1] });
    return;
  }

  if (shouldLaunchInteractiveApp(args)) {
    await launchInteractiveApp({ executedBinaryPath: argv[1] });
    return;
  }

  const programFactory = rootContainer.resolve(CliProgramFactory);
  const program = programFactory.createProgram();
  await program.parseAsync(args, { from: 'user' });
}

const isMainModule = isCurrentModuleEntrypoint(process.argv[1], import.meta.url, [
  'index.js',
  'index.ts',
]);

if (isMainModule) {
  main()
    .then(() => {
      process.exit(process.exitCode ?? 0);
    })
    .catch((error: unknown) => {
      const loggerFactory = rootContainer.resolve(LOGGER_FACTORY);
      loggerFactory.create('cli').error(error);
      process.exit(1);
    });
}
