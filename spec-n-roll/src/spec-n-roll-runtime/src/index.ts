#!/usr/bin/env node
import 'reflect-metadata';
import chalk from 'chalk';
import { Command } from 'commander';
import { container, type DependencyContainer } from 'tsyringe';
import { Logger } from 'tslog';

/**
 * Runs the executable behavior after commander has parsed process arguments.
 */
interface CommandRunner {
  /**
   * Executes the command action and writes any user-facing output.
   */
  run(): void;
}

/**
 * Emits diagnostic messages for the runtime executable without changing the
 * user-facing command output.
 */
const logger = new Logger({ name: 'spec-n-roll-runtime', minLevel: 6 });

/**
 * Identifies the command runner registration in the executable dependency container.
 */
const commandRunnerToken = 'spec-n-roll-runtime.commandRunner';

/**
 * Creates a dependency container for one runtime command invocation.
 *
 * @returns A child dependency container with command execution services registered.
 */
function createCommandContainer(): DependencyContainer {
  const commandContainer = container.createChildContainer();
  commandContainer.registerInstance<CommandRunner>(commandRunnerToken, {
    run() {
      logger.debug('Running runtime stub.');
      console.log(chalk.green('spec-n-roll-runtime'));
    },
  });

  return commandContainer;
}

/**
 * Creates the internal runtime command line program.
 *
 * @returns A commander program configured for the runtime executable.
 */
export function createProgram(): Command {
  return new Command()
    .name('spec-n-roll-runtime')
    .description('Runs spec-n-roll runtime commands.')
    .version('0.1.0')
    .action(() => {
      createCommandContainer().resolve<CommandRunner>(commandRunnerToken).run();
    });
}

/**
 * Runs the internal runtime executable stub.
 */
function main(): void {
  createProgram().parse(process.argv);
}

main();
