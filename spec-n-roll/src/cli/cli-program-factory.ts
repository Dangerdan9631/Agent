import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { TOP_LEVEL_CLI_COMMAND } from '../di/tokens.js';
import { readToolkitPackageVersion } from '../sdk/version.js';
import type { CliCommand } from './commands/cli-command.js';

/**
 * Builds the root Commander program from injected top-level CLI command classes.
 */
@injectable()
export class CliProgramFactory {
  constructor(
    @injectAll(TOP_LEVEL_CLI_COMMAND) private readonly commands: CliCommand[],
  ) {}

  /**
   * Creates and configures the Commander program with all CLI commands and options.
   *
   * @returns The configured Commander program instance.
   */
  createProgram(): Command {
    const program = new Command();

    program
      .name('spec-n-roll')
      .description('Specification-driven workflow toolkit for AI coding agents')
      .version(readToolkitPackageVersion())
      .option('--global', 'Run the globally installed CLI instead of a project-local copy');

    for (const command of this.commands) {
      command.register(program);
    }

    return program;
  }
}
