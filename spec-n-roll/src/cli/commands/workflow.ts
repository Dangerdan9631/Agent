import { Command } from 'commander';

import { registerWorkflowStateCommand } from './workflow-state.js';

/**
 * Registers the `workflow` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerWorkflowCommand(program: Command): void {
  const workflow = program.command('workflow').description('Workflow state operations');

  registerWorkflowStateCommand(workflow);
}
