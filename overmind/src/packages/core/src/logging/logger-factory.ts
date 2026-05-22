import { Logger } from "./logger";
import { LogLevel } from "./log-level";

export const LoggerFactoryToken = Symbol.for('Overmind.LoggerFactory');

export interface LoggerFactory {
  logLevel(level: LogLevel): LoggerFactory;
  create(category: string): Logger;
}

