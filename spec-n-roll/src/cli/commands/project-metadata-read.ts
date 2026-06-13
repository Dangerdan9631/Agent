import { Command } from 'commander';

import { readProjectMetadata } from '../../core/project-metadata.js';

/**
 * Registers the `project metadata read` subcommand on the project metadata command group.
 *
 * @param metadata - Commander `project metadata` command to attach the subcommand to.
 */
export function registerProjectMetadataReadCommand(metadata: Command): void {
  metadata
    .command('read')
    .description('Read project-metadata.json')
    .action(async () => {
      const result = await readProjectMetadata(process.cwd());
      console.log(JSON.stringify(result, null, 2));
    });
}
