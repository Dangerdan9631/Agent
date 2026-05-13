import { injectable } from "tsyringe";
import { ConsoleLogger } from "./console-logger";
import { LoggerFactory, LogLevel, Logger } from "./logger";

@injectable()
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
