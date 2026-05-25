import { LoggerFactoryToken } from '@overmind-cli/di/logger-factory-token';
import type { Command } from 'commander';
import { OvermindApiFactory } from 'overmind-sdk';
import type { Logger,LoggerFactory } from 'overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

import type { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class StartCerebrateCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
        private readonly overmindApi: OvermindApiFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StartCerebrateCommand');
  }

  register(program: Command): void {
    program
      .command('start-cerebrate')
      .description('Start a cerebrate instance by name.')
      .argument('<name>', 'Cerebrate name.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.')
      .action(async (name: string, options) => {
        const response = await this.overmindApi.create(options.configDir).startCerebrate({ name });
        this.logger.info(`Cerebrate started: ${response.name}`);
      });
  }
}
