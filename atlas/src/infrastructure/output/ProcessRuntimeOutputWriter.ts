import type { RuntimeOutputWriter } from '#application/shared/output/RuntimeOutputWriter.js';

/**
 * Writes intentional command output through the Node.js process streams.
 */
export class ProcessRuntimeOutputWriter implements RuntimeOutputWriter {
  /**
   * Writes one user-facing result line to standard output.
   *
   * @param message - Complete line of command output without a trailing newline requirement.
   */
  public writeLine(message: string): void {
    process.stdout.write(`${message}\n`);
  }

  /**
   * Writes one user-facing error line to standard error.
   *
   * @param message - Complete line of command output without a trailing newline requirement.
   */
  public writeErrorLine(message: string): void {
    process.stderr.write(`${message}\n`);
  }
}
