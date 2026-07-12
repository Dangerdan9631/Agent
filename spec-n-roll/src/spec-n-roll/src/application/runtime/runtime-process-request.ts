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
   * JSON payload transferred privately to the runtime process environment.
   */
  readonly invocation: string;

  /**
   * Environment variable name understood by the selected runtime package.
   */
  readonly invocationEnvironmentVariable: string;
}
