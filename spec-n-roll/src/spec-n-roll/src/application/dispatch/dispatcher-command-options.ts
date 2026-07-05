/**
 * Captures dispatcher-only options parsed by Commander before dispatch.
 */
export interface DispatcherCommandOptions {
  /**
   * True when the caller requested global runtime routing. The value only
   * affects target selection and does not disable project root discovery.
   */
  readonly global?: boolean;

  /**
   * Optional project root path supplied by the caller. Relative paths are
   * resolved from the dispatcher current working directory.
   */
  readonly root?: string;
}
