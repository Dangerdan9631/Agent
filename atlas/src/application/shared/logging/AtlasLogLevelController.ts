/**
 * Controls the minimum diagnostic severity emitted by one Atlas logger instance.
 */
export interface AtlasLogLevelController {
  /**
   * Applies a validated minimum diagnostic severity for the remainder of the process invocation.
   *
   * @param level - Minimum emitted severity using Atlas's lower-case command-line vocabulary.
   */
  setMinimumLevel(level: AtlasLogLevel): void;
}

/**
 * Identifies supported Atlas command-line diagnostic severity levels.
 */
export type AtlasLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
