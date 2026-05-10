import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { CerebrateListener } from '../core/cerebrate-listener.js';

@injectable()
export class AttachCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly cerebrateListener: CerebrateListener,
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
        await new Promise<void>((resolve, reject) => {
          this.cerebrateListener.attach(
            options.configDir,
            name,
            (line) => {
              this.logger.info(line);
            },
            (error) => {
              reject(error);
            },
            () => {
              resolve();
            }
          ).catch((error) => {
            reject(error);
          });
        })
      });
  }
}