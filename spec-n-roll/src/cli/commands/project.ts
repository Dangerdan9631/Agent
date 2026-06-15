import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { PROJECT_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `project` command group and its subcommands.
 */
@injectable()
export class ProjectCommand implements CliCommand {
  constructor(@injectAll(PROJECT_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const project = command.command('project').description('Project metadata operations');
    for (const subcommand of this.subcommands) {
      subcommand.register(project);
    }
  }
}
