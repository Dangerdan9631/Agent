#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleConfigAddAgentCommand } from './commands/config-add-agent.js';
import { handleInitCommand } from './commands/init.js';
import { handleUpdateCommand } from './commands/update.js';
import { argvRequestsVersion, handleVersionCommand, printVersionReport } from './commands/version.js';
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
    .option('--yes', 'Non-interactive mode; skip confirmation prompts')
    .option('--confirm-migration', 'Apply breaking config migrations without prompting (US10)')
    .description('Update the toolkit to the latest version')
    .action(
      async (commandOptions: {
        dryRun?: boolean;
        yes?: boolean;
        confirmMigration?: boolean;
      }) => {
        await handleUpdateCommand(commandOptions);
      },
    );

  const config = program.command('config').description('Configure spec-n-roll settings');

  config
    .command('add-agent')
    .description('Add an agent to the project configuration')
    .option('--yes', 'Non-interactive mode; requires --agent')
    .option('--agent <id>', 'Bundled agent id to add (e.g. copilot)')
    .action(async (commandOptions: { yes?: boolean; agent?: string }) => {
      await handleConfigAddAgentCommand(commandOptions);
    });

  program
    .command('version')
    .description('Show installed spec-n-roll versions')
    .action(() => {
      handleVersionCommand();
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

  if (argvRequestsVersion(args)) {
    printVersionReport({ executedBinaryPath: argv[1] });
    return;
  }

  const program = createProgram();
  program.parse(args, { from: 'user' });
}

const isMainModule =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  main();
}
