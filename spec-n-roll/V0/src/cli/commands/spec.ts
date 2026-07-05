import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { SPEC_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `spec` command group and its subcommands.
 */
@injectable()
export class SpecCommand implements CliCommand {
  constructor(@injectAll(SPEC_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const spec = command.command('spec').description('spec.md frontmatter operations');
    for (const subcommand of this.subcommands) {
      subcommand.register(spec);
    }
  }
}
