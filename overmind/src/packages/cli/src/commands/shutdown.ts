import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { OvermindIpcClientFactory } from '../core';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { ShutdownError } from 'overmind-api';

@injectable()
export class ShutdownCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly clientFactory: OvermindIpcClientFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('ShutdownCommand');
  }

  register(program: Command): void {
    program
      .command('shutdown')
      .description('Request service shutdown.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (options) => {
        const client = this.clientFactory.getOvermindClient(options.configDir);
        const response = await client.shutdown({});
        if (!response.success) {
          throw new Error(response.error.errorMessage);
        }
        this.logger.info(response.result.message);
      });
  }
}
