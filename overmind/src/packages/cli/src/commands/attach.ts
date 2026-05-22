import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';
import { OvermindIpcClientFactory } from '../core/index.js';
import chalk from 'chalk';

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
      .description('Attach to the Overmind service or a running cerebrate output stream.')
      .argument('[name]', 'Cerebrate name. Leave blank to attach the Overmind service.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (name: string | undefined, options) => {
        const client = this.clientFactory.getOvermindClient(options.configDir);
        await new Promise<void>((resolve, reject) => {
          client.attach(
            { name, historyPlaybackSize: 100 }            
          ).then((result) => {
            if (result.success) {
              result.client.onOutput((output) => {
                this.logger.info(
                  chalk.yellow(`[${new Date(output.timestamp).toISOString()}]`),
                  chalk.white(output.data),
                );
              });
              result.client.onTerminate(() => {
                this.logger.info('Stream terminated.');
                resolve();
              });
              result.client.listen().then(() => {
                this.logger.info('Stream ended.');
                resolve();
              }).catch(reject);
            } else {
              reject(new Error(result.error.errorMessage));
            }
          }).catch(reject);
        });
      });
  }
}