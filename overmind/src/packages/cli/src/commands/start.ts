import type { Command } from 'commander';
import { type Logger, type LoggerFactory,LoggerFactoryToken } from 'overmind-core';
import { inject, injectable } from 'tsyringe';

import { StartServiceHelper } from '../adapters';
import { OvermindCliCommand } from './overmind-cli-command.js';

@injectable()
export class StartCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly serviceStarter: StartServiceHelper,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StartCommand');
  }

  register(program: Command): void {
    program
      .command('start')
      .description('Start the service process.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (options) => {
        await this.serviceStarter.startService(options.configDir);
        this.logger.info("Service started successfully.");
      });
  }
}
