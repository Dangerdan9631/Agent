import chalk from 'chalk';

import type { LoggerCreateOptions } from './logger-create-options.js';
import { LogLevel } from './log-level.js';
import type { Logger } from './logger.js';
import type { LoggerFactory } from './logger-factory.js';

/**
 * Formats and writes log lines to the process console with optional chalk styling.
 */
export class ConsoleLogger implements Logger {
  private readonly children = new Set<ConsoleLogger>();

  /**
   * @param level - Minimum severity this logger emits.
   * @param category - Category label shown on decorated lines.
   * @param plain - When true, writes args directly without log framing.
   */
  constructor(
    private level: LogLevel,
    private readonly category: string,
    private readonly plain = false,
  ) {}

  /**
   * Updates the minimum log level for this logger and matching children.
   *
   * @param level - New minimum severity to emit.
   * @returns This logger for chaining.
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
   * Creates a nested logger with an extended category name.
   *
   * @param category - Child category segment appended to this logger's category.
   * @param options - Optional formatting options such as plain output.
   * @returns A child console logger.
   */
  create(category: string, options?: LoggerCreateOptions): Logger {
    const child = new ConsoleLogger(
      this.level,
      `${this.category}:${category}`,
      options?.plain === true,
    );
    this.children.add(child);
    return child;
  }

  /**
   * Writes a debug-level message when the configured level allows it.
   *
   * @param args - Values to include in the log line.
   */
  debug(...args: unknown[]): void {
    if (this.level > LogLevel.Debug) {
      return;
    }
    this.write(LogLevel.Debug, args);
  }

  /**
   * Writes an info-level message when the configured level allows it.
   *
   * @param args - Values to include in the log line.
   */
  info(...args: unknown[]): void {
    if (this.level > LogLevel.Info) {
      return;
    }
    this.write(LogLevel.Info, args);
  }

  /**
   * Writes a warning-level message when the configured level allows it.
   *
   * @param args - Values to include in the log line.
   */
  warn(...args: unknown[]): void {
    if (this.level > LogLevel.Warn) {
      return;
    }
    this.write(LogLevel.Warn, args);
  }

  /**
   * Writes an error-level message.
   *
   * @param args - Values to include in the log line.
   */
  error(...args: unknown[]): void {
    this.write(LogLevel.Error, args);
  }

  /**
   * Returns whether this logger is still at the given level.
   *
   * @param level - Level to compare against the current minimum.
   * @returns True when the current minimum equals the given level.
   */
  hasLogLevel(level: LogLevel): boolean {
    return this.level === level;
  }

  private write(level: LogLevel, args: unknown[]): void {
    if (this.plain) {
      const writer = level === LogLevel.Error ? console.error : console.log;
      writer(...args);
      return;
    }

    const timestamp = chalk.green(new Date().toISOString());
    const category = chalk.blue(this.category);

    switch (level) {
      case LogLevel.Debug:
        console.info(timestamp, chalk.magenta('[DEBG]'), category, chalk.white(...args));
        return;
      case LogLevel.Info:
        console.info(timestamp, chalk.grey('[INFO]'), category, chalk.white(...args));
        return;
      case LogLevel.Warn:
        console.info(timestamp, chalk.yellow('[WARN]'), category, chalk.white(...args));
        return;
      case LogLevel.Error:
        console.info(timestamp, chalk.red('[EROR]'), category, chalk.red(...args));
        return;
    }
  }
}
