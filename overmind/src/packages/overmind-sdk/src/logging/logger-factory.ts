import { LogLevel } from "./log-level";
import { Logger } from "./logger";

export interface LoggerFactory {
  logLevel(level: LogLevel): LoggerFactory;
  create(category: string): Logger;
}

