import { LoggerFactoryToken } from '@overmind-cli/di';
import chalk from 'chalk';
import type { Command } from 'commander';
import { OvermindApiFactory } from 'overmind-sdk';
import type { Logger, LoggerFactory } from 'overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

import { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class AttachCommand implements OvermindCliCommand {
    private readonly logger: Logger;

    constructor(
        private readonly overmindApi: OvermindApiFactory,
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
    ) {
        this.logger = loggerFactory.create('AttachCommand');
    }

    register(program: Command): void {
        program
            .command('attach')
            .description('Attach to the Overmind service or a running cerebrate output stream.')
            .argument('[name]', 'Cerebrate name. Leave blank to attach the Overmind service.')
            .option('--config-dir <path>', 'Path to Overmind configuration directory.')
            .action(async (name: string | undefined, options) => {
                const channel = await this.overmindApi.create(options.configDir).attach({ name, historyPlaybackSize: 100 });
                channel.onOutput((output) => {
                    this.logger.info(
                        chalk.yellow(`[${new Date(output.timestamp).toISOString()}]`),
                        chalk.white(output.data),
                    );
                });
                channel.onTerminate(() => {
                    this.logger.info('Stream terminated.');
                });
                channel.onError((error) => {
                    this.logger.error(error.message);
                });
                    
                await channel.listen();
            });
    }
}