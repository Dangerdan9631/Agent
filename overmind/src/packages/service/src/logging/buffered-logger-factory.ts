import { injectable } from 'tsyringe';
import { BufferedLogBuffer, BufferedLogger } from './buffered-logger';
import { LoggerFactory, LogLevel, Logger } from './logger';

@injectable()
export class BufferedLoggerFactory implements LoggerFactory {
    private level = LogLevel.Info;

    constructor(private readonly buffer: BufferedLogBuffer) { }

    logLevel(level: LogLevel): LoggerFactory {
        this.level = level;
        return this;
    }

    create(category: string): Logger {
        return new BufferedLogger(this.level, category, this.buffer);
    }
}