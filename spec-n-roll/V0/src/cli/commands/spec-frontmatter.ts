import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { SPEC_FRONTMATTER_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `spec frontmatter` command group and its subcommands.
 */
@injectable()
export class SpecFrontmatterCommand implements CliCommand {
  constructor(@injectAll(SPEC_FRONTMATTER_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const frontmatter = command
      .command('frontmatter')
      .description('Non-status frontmatter updates');
    for (const subcommand of this.subcommands) {
      subcommand.register(frontmatter);
    }
  }
}
