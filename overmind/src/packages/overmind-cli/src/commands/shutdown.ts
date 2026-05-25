import type { Command } from 'commander';
import { inject, injectable } from 'tsyringe';
import { OvermindApiFactory } from 'overmind-sdk';
import type { LoggerFactory, Logger } from 'overmind-sdk/logging';
import { LoggerFactoryToken } from '@overmind-cli/di';
import { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class ShutdownCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
      private readonly overmindApi: OvermindApiFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('ShutdownCommand');
  }

  register(program: Command): void {
    program
      .command('shutdown')
      .description('Request service shutdown.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.')
      .option('--force', 'Kill all running service processes.')
      .action(async (options) => {
        const response = await this.overmindApi.create(options.configDir).shutdown({ force: options.force });
        this.logger.info(response.message);
      });
  }
}
