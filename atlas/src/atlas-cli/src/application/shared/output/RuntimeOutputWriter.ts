/**
 * Writes intentional command results to the process output streams.
 */
export interface RuntimeOutputWriter {
  /**
   * Writes one user-facing result line to standard output.
   *
   * @param message - Complete line of command output without a trailing newline requirement.
   */
  writeLine(message: string): void;

  /**
   * Writes one user-facing error line to standard error.
   *
   * @param message - Complete line of command output without a trailing newline requirement.
   */
  writeErrorLine(message: string): void;
}
