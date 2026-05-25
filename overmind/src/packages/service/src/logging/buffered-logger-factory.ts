import { Logger,LoggerFactory, LogLevel } from 'overmind-core';
import { injectable } from 'tsyringe';

import { BufferedLogBuffer, BufferedLogger } from './buffered-logger';

@injectable()
export class BufferedLoggerFactory implements LoggerFactory {
    private level = LogLevel.Info;
    private readonly children = new Set<BufferedLogger>();

    constructor(private readonly buffer: BufferedLogBuffer) { }

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
        const child = new BufferedLogger(this.level, category, this.buffer);
        this.children.add(child);
        return child;
    }
}