import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { OvermindIpcClientFactory } from '../core/index.js';

@injectable()
export class AttachCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly clientFactory: OvermindIpcClientFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('AttachCommand');
  }

  register(program: Command): void {
    program
      .command('attach')
      .description('Attach to a running cerebrate output stream until the connection closes.')
      .argument('<name>', 'Cerebrate name.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (name: string, options) => {
        const client = this.clientFactory.getOvermindClient(options.configDir);
        await new Promise<void>((resolve, reject) => {
          client.attach(
            { name },
            {
              onReceive: (packet) => { this.logger.info(packet.data); },
              onTerminate: () => { resolve(); },
            }
          ).then((result) => {
            if (!result.success) {
              reject(new Error(result.error.errorMessage));
            }
          }).catch(reject);
        });
      });
  }
}