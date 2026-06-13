import { Command } from 'commander';

import { registerWorkflowStateReadCommand } from './workflow-state-read.js';
import { registerWorkflowStateWriteCommand } from './workflow-state-write.js';

/**
 * Registers the `workflow state` command group and its subcommands.
 *
 * @param workflow - Commander `workflow` command to attach the group to.
 */
export function registerWorkflowStateCommand(workflow: Command): void {
  const state = workflow
    .command('state')
    .description('Read and write workflow-state.json for a task spec');

  registerWorkflowStateReadCommand(state);
  registerWorkflowStateWriteCommand(state);
}
