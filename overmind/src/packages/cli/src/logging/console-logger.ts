import chalk from 'chalk';
import { Logger, LogLevel, LoggerFactory } from "./logger";

export class ConsoleLogger implements Logger {
    constructor(
        private level: LogLevel,
        private readonly category: string
    ) { }

    logLevel(level: LogLevel): LoggerFactory {
        this.level = level;
        return this;
    }

    create(category: string): Logger {
        return new ConsoleLogger(this.level, `${this.category}:${category}`);
    }

    debug(...args: unknown[]): void {
        if (this.level > LogLevel.Debug) return;
        console.info(
            chalk.green(new Date().toISOString()),
            chalk.magenta('[DEBG]'),
            chalk.blue(this.category),
            chalk.white(...args)
        );
    }

    info(...args: unknown[]): void {
        if (this.level > LogLevel.Info) return;
        console.info(
            chalk.green(new Date().toISOString()),
            chalk.grey('[INFO]'),
            chalk.blue(this.category),
            chalk.white(...args)
        );
    }

    warn(...args: unknown[]): void {
        if (this.level > LogLevel.Warn) return;
        console.info(
            chalk.green(new Date().toISOString()),
            chalk.yellow('[WARN]'),
            chalk.blue(this.category),
            chalk.white(...args)
        );
    }

    error(...args: unknown[]): void {
        console.info(
            chalk.green(new Date().toISOString()),
            chalk.red('[EROR]'),
            chalk.blue(this.category),
            chalk.red(...args)
        );
    }
}
