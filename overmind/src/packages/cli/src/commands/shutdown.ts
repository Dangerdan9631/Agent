import type { Command } from 'commander';
import { type Logger, type LoggerFactory,LoggerFactoryToken } from 'overmind-core';
import { inject, injectable } from 'tsyringe';

import { OvermindIpcClientFactory, StopServiceHelper } from '../adapters';
import { OvermindCliCommand } from './overmind-cli-command.js';

@injectable()
export class ShutdownCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly clientFactory: OvermindIpcClientFactory,
    private readonly serviceStop: StopServiceHelper,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('ShutdownCommand');
  }

  register(program: Command): void {
    program
      .command('shutdown')
      .description('Request service shutdown.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .option('--force', 'Kill all running service processes.')
      .action(async (options) => {
        if (options.force) {
          const count = this.serviceStop.killAllServiceProcesses(options.configDir);
          this.logger.info(`Killed ${count} service process${count === 1 ? '' : 'es'}.`);
          return;
        }
        const client = this.clientFactory.getOvermindClient(options.configDir);
        const response = await client.shutdown({});
        this.logger.info(response.message);
      });
  }
}
