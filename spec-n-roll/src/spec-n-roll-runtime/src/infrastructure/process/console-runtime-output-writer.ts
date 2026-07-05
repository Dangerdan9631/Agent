import type { RuntimeOutputWriter } from '#runtime/application/output/runtime-output-writer.js';

/**
 * Writes runtime output to stdout.
 */
export class ConsoleRuntimeOutputWriter implements RuntimeOutputWriter {
  /**
   * Writes a line of text to stdout.
   *
   * @param text - Text to write without a trailing newline.
   */
  writeLine(text: string): void {
    process.stdout.write(`${text}\n`);
  }
}
