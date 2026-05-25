import { LoggerFactoryToken } from '@overmind-cli/di/logger-factory-token';
import type { Command } from 'commander';
import { OvermindApiFactory } from 'overmind-sdk';
import type { Logger,LoggerFactory } from 'overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

import type { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class SendCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly overmindApi: OvermindApiFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('SendCommand');
  }

  register(program: Command): void {
    program
      .command('send-command')
      .description('Send a command to a running cerebrate.')
      .argument('<name>', 'Cerebrate name.')
      .argument('<command>', 'Command name.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.')
      .action(async (name: string, command: string, options) => {
        const response = await this.overmindApi.create(options.configDir).sendCerebrateCommand({ 
          cerebrateName: name,
          command,
        });
        this.logger.info(response.output);
      });
  }
}
