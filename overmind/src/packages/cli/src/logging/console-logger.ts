import chalk from 'chalk';
import { Logger, LoggerFactory,LogLevel } from 'overmind-core';

export class ConsoleLogger implements Logger {
    private readonly children = new Set<ConsoleLogger>();

    constructor(
        private level: LogLevel,
        private readonly category: string
    ) { }

    logLevel(level: LogLevel): LoggerFactory {
        const previousLevel = this.level;
        this.level = level;

        for (const child of this.children) {
            if (child.hasLogLevel(previousLevel)) {
                child.logLevel(level);
            }
        }

        return this;
    }

    create(category: string): Logger {
        const child = new ConsoleLogger(this.level, `${this.category}:${category}`);
        this.children.add(child);
        return child;
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

    hasLogLevel(level: LogLevel): boolean {
        return this.level === level;
    }
}
