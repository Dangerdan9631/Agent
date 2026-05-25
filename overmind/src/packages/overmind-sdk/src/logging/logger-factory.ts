import { Logger } from "./logger";
import { LogLevel } from "./log-level";

export interface LoggerFactory {
  logLevel(level: LogLevel): LoggerFactory;
  create(category: string): Logger;
}

