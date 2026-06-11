#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveDelegation, stripGlobalFlag } from './dispatcher.js';

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
    .action(() => {
      notImplemented('init');
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

  return program;
}

/**
 * Detects if the CLI is running from a project-local installation to enable delegation logic.
 *
 * @returns True if running from a local installation, false otherwise.
 */
function isLocalCliInstall(): boolean {
  const normalized = fileURLToPath(import.meta.url).replace(/\\/g, '/');
  return normalized.includes('/.spec-n-roll/cli/bin/');
}

/**
 * Entry point that handles delegation to local installs and parses CLI arguments.
 *
 * @param argv - The command line arguments to parse.
 */
export function main(argv: string[] = process.argv): void {
  const rawArgs = argv.slice(2);

  if (!isLocalCliInstall()) {
    const delegation = resolveDelegation(rawArgs);
    if (delegation.action === 'delegated') {
      process.exit(delegation.exitCode);
    }
    if (delegation.action === 'error') {
      console.error(delegation.message);
      process.exit(delegation.exitCode);
    }
  }

  const { args } = stripGlobalFlag(rawArgs);
  const program = createProgram();
  program.parse(['node', 'spec-n-roll', ...args], { from: 'user' });
}

const isMainModule =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  main();
}
