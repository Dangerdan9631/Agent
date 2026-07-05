#!/usr/bin/env node

import '../di/bootstrap.js';

import { rootContainer } from '../di/container.js';
import { LOGGER_FACTORY } from '../di/tokens.js';
import { isCurrentModuleEntrypoint } from '../sdk/core/paths.js';
import { CliProgramFactory } from './cli-program-factory.js';
import { argvRequestsVersion, printVersionReport } from './version-invocation.js';

/**
 * Entry point for the full CLI binary that parses subcommands and options.
 *
 * @param argv - The command line arguments to parse.
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  const rawArgs = argv.slice(2);

  if (argvRequestsVersion(rawArgs)) {
    const loggerFactory = rootContainer.resolve(LOGGER_FACTORY);
    const logger = loggerFactory.create('version', { plain: true });
    printVersionReport(logger, { executedBinaryPath: argv[1] });
    return;
  }

  const programFactory = rootContainer.resolve(CliProgramFactory);
  const program = programFactory.createProgram();
  await program.parseAsync(rawArgs, { from: 'user' });
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
