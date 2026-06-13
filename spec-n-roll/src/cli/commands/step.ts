import { Command } from 'commander';

import { registerStepInstantiateCommand } from './step-instantiate.js';

/**
 * Registers the `step` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerStepCommand(program: Command): void {
  const step = program.command('step').description('Step output template operations');

  registerStepInstantiateCommand(step);
}
