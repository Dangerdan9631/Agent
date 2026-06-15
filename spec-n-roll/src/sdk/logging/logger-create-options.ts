/**
 * Options controlling how a child logger formats and writes output.
 */
export interface LoggerCreateOptions {
  /**
   * When true, writes messages directly without timestamp, level, or category framing.
   */
  plain?: boolean;
}
