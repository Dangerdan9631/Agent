import type { Command } from 'commander';
import { type Logger, type LoggerFactory,LoggerFactoryToken } from 'overmind-core';
import { inject, injectable } from 'tsyringe';

import { OvermindIpcClientFactory } from '../adapters';
import { OvermindCliCommand } from './overmind-cli-command.js';

@injectable()
export class StartCerebrateCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly clientFactory: OvermindIpcClientFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StartCerebrateCommand');
  }

  register(program: Command): void {
    program
      .command('start-cerebrate')
      .description('Start a cerebrate instance by name.')
      .argument('<name>', 'Cerebrate name.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (name: string, options) => {
        const client = this.clientFactory.getOvermindClient(options.configDir);
        const response = await client.startCerebrate({ name });
        this.logger.info(`Cerebrate started: ${response.name}`);
      });
  }
}
