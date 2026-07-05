import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { STEP_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `step` command group and its subcommands.
 */
@injectable()
export class StepCommand implements CliCommand {
  constructor(@injectAll(STEP_SUBCOMMAND) private readonly subcommands: CliCommand[]) {}

  register(command: Command): void {
    const step = command
      .command('step')
      .description('Step lifecycle and output template operations');
    for (const subcommand of this.subcommands) {
      subcommand.register(step);
    }
  }
}
