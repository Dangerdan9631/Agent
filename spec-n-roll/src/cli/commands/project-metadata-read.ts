import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { readProjectMetadata } from '../../sdk/core/project-metadata.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `project metadata read` CLI subcommand.
 */
@injectable()
export class ProjectMetadataReadCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('read')
      .description('Read project-metadata.json')
      .action(async () => {
        const result = await readProjectMetadata(process.cwd());
        console.log(JSON.stringify(result, null, 2));
      });
  }
}
