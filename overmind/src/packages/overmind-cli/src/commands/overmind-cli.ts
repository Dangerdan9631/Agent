import packageJson from '@overmind-cli/../package.json';
import { LoggerFactoryToken } from '@overmind-cli/di/logger-factory-token';
import { OvermindCliCommandToken } from '@overmind-cli/di/overmind-cli-command-token';
import { Command } from "commander";
import type { Logger, LoggerFactory } from "overmind-sdk/logging";
import { inject, injectable, injectAll } from "tsyringe";

import type { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class OvermindCli {
    private readonly program: Command;
    private readonly logger: Logger;

    constructor(
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
        @injectAll(OvermindCliCommandToken) commands: OvermindCliCommand[]
    ) {
        this.logger = loggerFactory.create('main');
        this.program = new Command();
        this.program
            .name('overmind')
            .description('Control the Overmind service.')
            .version(packageJson.version);

        commands.forEach(command => command.register(this.program));
    }

    async run(args: string[]): Promise<number> {
        try {
            await this.program.parseAsync(args);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unexpected CLI error.';
            this.logger.error(message);
            return 1;
        }

        return 0;
    }
}
