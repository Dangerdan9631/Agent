import { Command } from 'commander';

import { registerStepFinalizeCommand } from './step-finalize.js';
import { registerStepInitCommand } from './step-init.js';
import { registerStepInstantiateCommand } from './step-instantiate.js';

/**
 * Registers the `step` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerStepCommand(program: Command): void {
  const step = program
    .command('step')
    .description('Step lifecycle and output template operations');

  registerStepInitCommand(step);
  registerStepFinalizeCommand(step);
  registerStepInstantiateCommand(step);
}
