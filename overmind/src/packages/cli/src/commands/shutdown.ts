import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { OvermindIpcClientFactory, StopServiceHelper } from '../core';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';

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
        if (!response.success) {
          throw new Error(response.error.errorMessage);
        }
        this.logger.info(response.result.message);
      });
  }
}
