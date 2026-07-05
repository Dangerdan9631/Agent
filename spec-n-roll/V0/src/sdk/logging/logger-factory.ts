import type { LoggerCreateOptions } from './logger-create-options.js';
import type { LogLevel } from './log-level.js';
import type { Logger } from './logger.js';

/**
 * Creates categorized loggers and adjusts the minimum severity for new children.
 */
export interface LoggerFactory {
  /**
   * Sets the minimum log level for this factory and matching child loggers.
   *
   * @param level - Minimum severity to emit.
   * @returns This factory for chaining.
   */
  logLevel(level: LogLevel): LoggerFactory;

  /**
   * Creates a child logger for a named category.
   *
   * @param category - Short label identifying the log source.
   * @param options - Optional formatting options such as plain machine-readable output.
   * @returns A logger scoped to the given category.
   */
  create(category: string, options?: LoggerCreateOptions): Logger;
}
