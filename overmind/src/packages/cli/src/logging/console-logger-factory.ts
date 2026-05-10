import { injectable } from "tsyringe";
import { ConsoleLogger } from "./console-logger";
import { LoggerFactory, LogLevel, Logger } from "./logger";

@injectable()
export class ConsoleLoggerFactory implements LoggerFactory {
    private level = LogLevel.Info;

    logLevel(level: LogLevel): LoggerFactory {
        this.level = level;
        return this;
    }

    create(category: string): Logger {
        return new ConsoleLogger(this.level, category);
    }
}
