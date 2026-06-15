import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { readProjectMetadata } from '../../sdk/core/project-metadata.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `project metadata read` CLI subcommand.
 */
@injectable()
export class ProjectMetadataReadCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('ProjectMetadataReadCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('read')
      .description('Read project-metadata.json')
      .action(async () => {
        const result = await readProjectMetadata(process.cwd());
        this.output.info(JSON.stringify(result, null, 2));
      });
  }
}
