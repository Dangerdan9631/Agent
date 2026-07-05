import type { LoggerFactory } from './logger-factory.js';

/**
 * Writes leveled messages for a single named category.
 */
export interface Logger extends LoggerFactory {
  /**
   * Writes a debug-level message when the configured level allows it.
   *
   * @param args - Values to include in the log line.
   */
  debug(...args: unknown[]): void;

  /**
   * Writes an info-level message when the configured level allows it.
   *
   * @param args - Values to include in the log line.
   */
  info(...args: unknown[]): void;

  /**
   * Writes a warning-level message when the configured level allows it.
   *
   * @param args - Values to include in the log line.
   */
  warn(...args: unknown[]): void;

  /**
   * Writes an error-level message.
   *
   * @param args - Values to include in the log line.
   */
  error(...args: unknown[]): void;
}
