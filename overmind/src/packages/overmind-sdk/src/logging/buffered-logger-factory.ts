import { BufferedLogBuffer,BufferedLogger } from "./buffered-logger";
import { LogLevel } from "./log-level";
import { Logger } from "./logger";
import { LoggerFactory } from "./logger-factory";

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