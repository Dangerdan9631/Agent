/**
 * Reads raw filesystem values needed by dispatcher application behavior.
 */
export interface DispatcherFileSystem {
  /**
   * Determines whether a filesystem path exists.
   *
   * @param path - Absolute or relative filesystem path to inspect.
   * @returns true when the path exists, otherwise false.
   */
  pathExists(path: string): boolean;

  /**
   * Reads UTF-8 text without exposing filesystem failures to application code.
   *
   * @param path - Absolute or relative filesystem path to read.
   * @returns File text when readable, otherwise undefined.
   */
  readText(path: string): string | undefined;
}
