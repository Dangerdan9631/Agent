/**
 * Writes the application's designed user-facing output to the runtime stream.
 */
export class RuntimeOutputWriter {
  /**
   * Writes one complete user-facing line.
   *
   * @param message - Rendered content without a trailing newline.
   */
  public writeLine(message: string): void {
    stdout.write(`${message}\n`);
  }
}
import { stdout } from 'node:process';
