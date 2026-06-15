import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { MANIFESTO_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `manifesto` command group and its subcommands.
 */
@injectable()
export class ManifestoCommand implements CliCommand {
  constructor(@injectAll(MANIFESTO_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const manifesto = command
      .command('manifesto')
      .description('Read-only Spec Manifesto operations');
    for (const subcommand of this.subcommands) {
      subcommand.register(manifesto);
    }
  }
}
