import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { StartServiceHelper } from '../core/start-service.js';

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
