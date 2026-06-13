import { Command } from 'commander';

import { registerProjectMetadataReadCommand } from './project-metadata-read.js';
import { registerProjectMetadataWriteCommand } from './project-metadata-write.js';

/**
 * Registers the `project metadata` command group and its subcommands.
 *
 * @param project - Commander `project` command to attach the group to.
 */
export function registerProjectMetadataCommand(project: Command): void {
  const metadata = project.command('metadata').description('project-metadata.json read/write');

  registerProjectMetadataReadCommand(metadata);
  registerProjectMetadataWriteCommand(metadata);
}
