import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { OvermindIpcClientFactory } from '../core';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { SendCerebrateCommandError } from 'overmind-api';

@injectable()
export class SendCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly clientFactory: OvermindIpcClientFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('SendCommand');
  }

  register(program: Command): void {
    program
      .command('send-command')
      .description('Send a named command to a running cerebrate (prints the command value).')
      .argument('<name>', 'Cerebrate name.')
      .argument('<command>', 'Command name from cerebrate-config.yaml.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (name: string, command: string, options) => {
        const client = this.clientFactory.getOvermindClient(options.configDir);
        const response = await client.sendCerebrateCommand({ name, command });
        if (!response.success) {
          throw new Error(response.error.errorMessage);
        }
        this.logger.info(response.result.output);
      });
  }
}
