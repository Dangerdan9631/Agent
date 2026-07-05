/**
 * Writes user-facing runtime output.
 */
export interface RuntimeOutputWriter {
  /**
   * Writes a line of output to the runtime console.
   *
   * @param text - Text to write. The value should not include a trailing newline.
   */
  writeLine(text: string): void;
}
