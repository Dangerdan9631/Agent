/**
 * Creates normalized CLI argument arrays for process execution tests.
 */
export class CliArgumentListFactory {
  /**
   * Creates a normalized CLI argument array for process execution tests.
   *
   * @param args - Individual command line arguments in the order they should be passed.
   * @returns A readonly argument array suitable for child process calls.
   */
  create(...args: string[]): readonly string[] {
    return args;
  }
}
