import { Command } from 'commander';
import { registry, injectable, injectAll, inject } from 'tsyringe';
import packageJson from '../package.json';
import {
    AttachCommand,
    OvermindCliCommand,
    OvermindCliCommandToken,
    SendCommand,
    ShutdownCommand,
    StartCerebrateCommand,
    StartCommand,
    StatsCommand,
    StopCerebrateCommand
} from './commands';
import { Logger, type LoggerFactory, LoggerFactoryToken } from 'overmind-core';
import { ConsoleLoggerFactory } from './logging/console-logger-factory';

@injectable()
@registry([
    { token: LoggerFactoryToken, useClass: ConsoleLoggerFactory },
    { token: OvermindCliCommandToken, useClass: AttachCommand },
    { token: OvermindCliCommandToken, useClass: ShutdownCommand },
    { token: OvermindCliCommandToken, useClass: SendCommand },
    { token: OvermindCliCommandToken, useClass: StartCommand },
    { token: OvermindCliCommandToken, useClass: StartCerebrateCommand },
    { token: OvermindCliCommandToken, useClass: StopCerebrateCommand },
    { token: OvermindCliCommandToken, useClass: StatsCommand },
])
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
