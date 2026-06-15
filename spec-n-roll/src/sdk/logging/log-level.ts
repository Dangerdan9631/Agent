/**
 * Severity levels used to filter log output from a logger or factory.
 */
export enum LogLevel {
  /** Verbose diagnostic messages. */
  Debug = 0,
  /** Routine operational messages. */
  Info = 1,
  /** Recoverable or noteworthy issues. */
  Warn = 2,
  /** Failures and error conditions. */
  Error = 3,
}
