import { Command } from 'commander';

import { registerProjectMetadataCommand } from './project-metadata.js';

/**
 * Registers the `project` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerProjectCommand(program: Command): void {
  const project = program.command('project').description('Project metadata operations');

  registerProjectMetadataCommand(project);
}
