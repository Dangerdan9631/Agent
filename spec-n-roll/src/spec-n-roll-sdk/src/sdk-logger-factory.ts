import { Logger } from 'tslog';

/**
 * Creates SDK diagnostic loggers.
 */
export class SdkLoggerFactory {
  /**
   * Creates an SDK diagnostic logger.
   *
   * @returns A logger configured for SDK diagnostics.
   */
  create(): Logger<unknown> {
    return new Logger({ name: 'spec-n-roll-sdk', minLevel: 6 });
  }
}
