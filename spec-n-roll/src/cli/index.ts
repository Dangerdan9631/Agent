#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleInitCommand } from './commands/init.js';
import { registerCoreCommands } from './commands/core.js';
import { stripGlobalFlag } from './dispatcher.js';

/**
 * Reads the package version from package.json to display in CLI help and version output.
 *
 * @returns The package version string.
 */
function readPackageVersion(): string {
  const packageJsonPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../package.json',
  );
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
}

/**
 * Logs a placeholder message for commands that are not yet implemented.
 *
 * @param commandName - The name of the command that is not implemented.
 */
function notImplemented(commandName: string): void {
  console.log(`${commandName}: not implemented`);
}

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
    .version(readPackageVersion())
    .option('--global', 'Run the globally installed CLI instead of a project-local copy');

  program
    .command('init')
    .argument('[path]', 'Project directory to initialize', '.')
    .description('Initialize spec-n-roll in a project')
    .option('--yes', 'Non-interactive mode; requires --agents')
    .option('--agents <agents>', 'Comma-separated bundled agent ids (e.g. cursor,claude-code)')
    .action(async (targetPath: string, commandOptions: { yes?: boolean; agents?: string }) => {
      await handleInitCommand(targetPath, commandOptions);
    });

  program
    .command('update')
    .option('--dry-run', 'Preview update changes without applying them')
    .description('Update the toolkit to the latest version')
    .action(() => {
      notImplemented('update');
    });

  const config = program.command('config').description('Configure spec-n-roll settings');

  config
    .command('add-agent')
    .description('Add an agent to the project configuration')
    .action(() => {
      notImplemented('config add-agent');
    });

  program
    .command('version')
    .description('Show installed spec-n-roll versions')
    .action(() => {
      notImplemented('version');
    });

  registerCoreCommands(program);

  return program;
}

/**
 * Entry point for the full CLI binary that parses subcommands and options.
 *
 * @param argv - The command line arguments to parse.
 */
export function main(argv: string[] = process.argv): void {
  const rawArgs = argv.slice(2);
  const { args } = stripGlobalFlag(rawArgs);
  const program = createProgram();
  program.parse(args, { from: 'user' });
}

const isMainModule =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  main();
}
