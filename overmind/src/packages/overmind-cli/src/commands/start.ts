import type { Command } from 'commander';
import { inject, injectable } from 'tsyringe';
import { OvermindApiFactory } from 'overmind-sdk';
import type { LoggerFactory, Logger } from 'overmind-sdk/logging';
import { LoggerFactoryToken } from '@overmind-cli/di';
import { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class StartCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly overmindApi: OvermindApiFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StartCommand');
  }

  register(program: Command): void {
    program
      .command('start')
      .description('Start the service process.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.')
      .action(async (options) => {
        await this.overmindApi.create(options.configDir).start({ });
        this.logger.info("Service started successfully.");
      });
  }
}
