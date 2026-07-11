/**
 * Describes raw data required to launch a selected runtime process.
 */
export interface RuntimeProcessRequest {
  /**
   * Absolute JavaScript entrypoint passed to Node.js.
   */
  readonly executablePath: string;

  /**
   * Ordered command arguments preserved for the selected runtime.
   */
  readonly argv: readonly string[];

  /**
   * Absolute working directory for the child process.
   */
  readonly cwd: string;

  /**
   * Newline-terminated JSON payload written to the child process standard input.
   */
  readonly stdin: string;
}
