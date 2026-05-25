import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';
import { OvermindIpcClientFactory } from '../adapters/index.js';
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
        const attachClient = await client.attach({ name, historyPlaybackSize: 100 });
        const onInterrupt = () => {
          void attachClient.terminate({ name });
        };

        attachClient.onAttached(() => undefined);
        attachClient.onOutput((output) => {
          this.logger.info(
            chalk.yellow(`[${new Date(output.timestamp).toISOString()}]`),
            chalk.white(output.data),
          );
        });
        attachClient.onTerminate(() => {
          this.logger.info('Stream terminated.');
        });
        attachClient.onError((error) => {
          this.logger.error(error.message);
        });

        process.once('SIGINT', onInterrupt);

        try {
          await attachClient.listen();
        } finally {
          process.off('SIGINT', onInterrupt);
        }
      });
  }
}