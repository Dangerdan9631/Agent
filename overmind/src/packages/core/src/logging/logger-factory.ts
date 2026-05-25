import { LogLevel } from "./log-level";
import { Logger } from "./logger";

export const LoggerFactoryToken = Symbol.for('Overmind.LoggerFactory');

export interface LoggerFactory {
  logLevel(level: LogLevel): LoggerFactory;
  create(category: string): Logger;
}

