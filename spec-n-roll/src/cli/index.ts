#!/usr/bin/env node

import { Command } from 'commander';

import { registerConfigCommand } from './commands/config.js';
import { registerInitCommand } from './commands/init.js';
import { registerListCommand } from './commands/list.js';
import { registerProjectCommand } from './commands/project.js';
import { registerSpecCommand } from './commands/spec.js';
import { registerStepCommand } from './commands/step.js';
import { registerTaskCommand } from './commands/task.js';
import { registerUpdateCommand } from './commands/update.js';
import {
  argvRequestsVersion,
  printVersionReport,
  readToolkitPackageVersion,
  registerVersionCommand,
} from './commands/version.js';
import { registerWorkflowCommand } from './commands/workflow.js';
import { isCurrentModuleEntrypoint } from '../core/paths.js';
import { stripGlobalFlag } from './dispatcher.js';

/**
 * Creates and configures the Commander program with all CLI commands and options.
 *
 * @returns The configured Commander program instance.
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('spec-n-roll')
    .description('Specification-driven workflow toolkit for AI coding agents')
    .version(readToolkitPackageVersion())
    .option('--global', 'Run the globally installed CLI instead of a project-local copy');

  registerInitCommand(program);
  registerVersionCommand(program);
  registerListCommand(program);
  registerUpdateCommand(program);
  registerConfigCommand(program);
  registerWorkflowCommand(program);
  registerTaskCommand(program);
  registerProjectCommand(program);
  registerStepCommand(program);
  registerSpecCommand(program);

  return program;
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
    printVersionReport({ executedBinaryPath: argv[1] });
    return;
  }

  const program = createProgram();
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
      console.error(error);
      process.exit(1);
    });
}
