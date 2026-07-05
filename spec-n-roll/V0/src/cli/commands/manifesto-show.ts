import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { loadManifestoShowEntries } from '../../sdk/manifesto.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `manifesto show` CLI subcommand.
 */
@injectable()
export class ManifestoShowCommand implements CliCommand {
  private readonly logger: Logger;
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('ManifestoShowCommand');
    this.output = loggerFactory.create('ManifestoShowCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('show')
      .description('Read Spec Manifesto content as JSON for debugging')
      .option('--global', 'Show only the global manifesto')
      .option('--step <stepId>', 'Show only the manifesto for one workflow step')
      .action(async (options: { global?: boolean; step?: string }) => {
        if (options.global === true && options.step != null) {
          this.logger.error('Use either --global or --step, not both.');
          process.exit(1);
        }

        const entries = await loadManifestoShowEntries(process.cwd(), options);
        this.output.info(JSON.stringify({ manifestos: entries }, null, 2));
      });
  }
}
