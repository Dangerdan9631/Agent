import { LoggerFactoryToken } from '@overmind-cli/di/logger-factory-token';
import type { Command } from 'commander';
import { OvermindApiFactory } from 'overmind-sdk';
import type { Logger,LoggerFactory } from 'overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

import type { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class StopCerebrateCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly overmindApi: OvermindApiFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StopCerebrate');
  }

  register(program: Command): void {
    program
      .command('stop-cerebrate')
      .description('Stop a cerebrate state machine instance.')
      .argument('<name>', 'Cerebrate name.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.')
      .action(async (name: string, options) => {
        const response = await this.overmindApi.create(options.configDir).stopCerebrate({ cerebrateName: name });
        
        if (response.stopped) {
          this.logger.info(response.message);
        } else {
          this.logger.warn(response.message);
        }
      });
  }
}
