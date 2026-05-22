import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { OvermindIpcClientFactory } from '../core';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';

@injectable()
export class StopCerebrateCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly clientFactory: OvermindIpcClientFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StopCerebrate');
  }

  register(program: Command): void {
    program
      .command('stop-cerebrate')
      .description('Stop a cerebrate state machine instance.')
      .argument('<name>', 'Cerebrate name.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (name: string, options) => {
        const client = this.clientFactory.getOvermindClient(options.configDir);
        const response = await client.stopCerebrate({ name });
        if (!response.success) {
          throw new Error(response.error.errorMessage);
        }
        
        if (response.result.stopped) {
          this.logger.info(response.result.message);
        } else {
          this.logger.warn(response.result.message);
        }
      });
  }
}
