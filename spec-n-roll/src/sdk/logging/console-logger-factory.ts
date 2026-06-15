import { ConsoleLogger } from './console-logger.js';
import type { LoggerCreateOptions } from './logger-create-options.js';
import { LogLevel } from './log-level.js';
import type { Logger } from './logger.js';
import type { LoggerFactory } from './logger-factory.js';

/**
 * Root factory that creates console loggers for CLI and other process adapters.
 */
export class ConsoleLoggerFactory implements LoggerFactory {
  private level = LogLevel.Info;
  private readonly children = new Set<ConsoleLogger>();

  /**
   * Updates the minimum log level for this factory and matching children.
   *
   * @param level - New minimum severity to emit.
   * @returns This factory for chaining.
   */
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

  /**
   * Creates a top-level console logger for a named category.
   *
   * @param category - Short label identifying the log source.
   * @param options - Optional formatting options such as plain output.
   * @returns A console logger scoped to the given category.
   */
  create(category: string, options?: LoggerCreateOptions): Logger {
    const child = new ConsoleLogger(this.level, category, options?.plain === true);
    this.children.add(child);
    return child;
  }
}
