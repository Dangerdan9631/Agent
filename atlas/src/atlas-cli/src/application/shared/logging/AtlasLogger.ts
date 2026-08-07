/**
 * Carries structured data that explains an Atlas diagnostic decision or failure.
 */
export interface AtlasLogContext {
  /**
   * Holds serializable values associated with a diagnostic event.
   */
  readonly values: Readonly<Record<string, unknown>>;
}

/**
 * Records diagnostic events without exposing a concrete logging framework to application behavior.
 */
export interface AtlasLogger {
  /**
   * Records a trace-level diagnostic event.
   *
   * @param message - Human-readable diagnostic text. Must not contain sensitive values.
   * @param context - Structured values that explain the event.
   */
  trace(message: string, context: AtlasLogContext): void;

  /**
   * Records a debug-level diagnostic event.
   *
   * @param message - Human-readable diagnostic text. Must not contain sensitive values.
   * @param context - Structured values that explain the event.
   */
  debug(message: string, context: AtlasLogContext): void;

  /**
   * Records an informational diagnostic event.
   *
   * @param message - Human-readable diagnostic text. Must not contain sensitive values.
   * @param context - Structured values that explain the event.
   */
  info(message: string, context: AtlasLogContext): void;

  /**
   * Records a warning diagnostic event.
   *
   * @param message - Human-readable diagnostic text. Must not contain sensitive values.
   * @param context - Structured values that explain the event.
   */
  warn(message: string, context: AtlasLogContext): void;

  /**
   * Records an error diagnostic event.
   *
   * @param message - Human-readable diagnostic text. Must not contain sensitive values.
   * @param context - Structured values that explain the event.
   */
  error(message: string, context: AtlasLogContext): void;
}
