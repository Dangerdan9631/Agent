import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { PROJECT_METADATA_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `project metadata` command group and its subcommands.
 */
@injectable()
export class ProjectMetadataCommand implements CliCommand {
  constructor(@injectAll(PROJECT_METADATA_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const metadata = command.command('metadata').description('project-metadata.json read/write');
    for (const subcommand of this.subcommands) {
      subcommand.register(metadata);
    }
  }
}
