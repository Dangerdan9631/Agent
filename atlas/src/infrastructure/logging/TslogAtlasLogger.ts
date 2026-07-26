import type { AtlasLogContext, AtlasLogger } from '#application/shared/logging/AtlasLogger.js';
import type {
  AtlasLogLevel,
  AtlasLogLevelController
} from '#application/shared/logging/AtlasLogLevelController.js';
import { Logger } from 'tslog';

/**
 * Adapts tslog diagnostic events to Atlas's application logging contract.
 */
export class TslogAtlasLogger implements AtlasLogger, AtlasLogLevelController {
  readonly #logger: Logger<unknown>;

  /**
   * Creates a logger that identifies diagnostics as Atlas runtime events.
   */
  public constructor() {
    this.#logger = new Logger({ name: 'atlas' });
  }

  /**
   * Applies a validated Atlas command-line severity as tslog's minimum emitted level.
   *
   * @param level - Minimum emitted severity using Atlas's lower-case command-line vocabulary.
   */
  public setMinimumLevel(level: AtlasLogLevel): void {
    this.#logger.settings.minLevel = this.toTslogLevel(level);
  }

  /**
   * Maps Atlas's lower-case command vocabulary to tslog's numeric default severity IDs.
   *
   * @param level - Atlas command-line diagnostic severity.
   * @returns tslog's numeric minimum severity ID.
   */
  private toTslogLevel(level: AtlasLogLevel): number {
    if (level === 'trace') {
      return 1;
    }
    if (level === 'debug') {
      return 2;
    }
    if (level === 'info') {
      return 3;
    }
    if (level === 'warn') {
      return 4;
    }
    return 5;
  }

  /**
   * Records a trace-level diagnostic event.
   *
   * @param message - Human-readable diagnostic text.
   * @param context - Structured values that explain the event.
   */
  public trace(message: string, context: AtlasLogContext): void {
    this.#logger.trace(context.values, message);
  }

  /**
   * Records a debug-level diagnostic event.
   *
   * @param message - Human-readable diagnostic text.
   * @param context - Structured values that explain the event.
   */
  public debug(message: string, context: AtlasLogContext): void {
    this.#logger.debug(context.values, message);
  }

  /**
   * Records an informational diagnostic event.
   *
   * @param message - Human-readable diagnostic text.
   * @param context - Structured values that explain the event.
   */
  public info(message: string, context: AtlasLogContext): void {
    this.#logger.info(context.values, message);
  }

  /**
   * Records a warning diagnostic event.
   *
   * @param message - Human-readable diagnostic text.
   * @param context - Structured values that explain the event.
   */
  public warn(message: string, context: AtlasLogContext): void {
    this.#logger.warn(context.values, message);
  }

  /**
   * Records an error diagnostic event.
   *
   * @param message - Human-readable diagnostic text.
   * @param context - Structured values that explain the event.
   */
  public error(message: string, context: AtlasLogContext): void {
    this.#logger.error(context.values, message);
  }
}
