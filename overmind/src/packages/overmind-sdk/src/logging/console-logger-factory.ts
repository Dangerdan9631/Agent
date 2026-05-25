import { ConsoleLogger } from "./console-logger";
import { LogLevel } from "./log-level";
import { Logger } from "./logger";
import { LoggerFactory } from "./logger-factory";

export class ConsoleLoggerFactory implements LoggerFactory {
    private level = LogLevel.Info;
    private readonly children = new Set<ConsoleLogger>();

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
        const child = new ConsoleLogger(this.level, category);
        this.children.add(child);
        return child;
    }
}
