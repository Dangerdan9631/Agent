/**
 * Describes inputs needed to resolve filesystem paths at a process boundary.
 */
export interface PathResolutionContext {
  /**
   * Absolute current working directory for the dispatcher process. Must be a
   * valid directory path.
   */
  readonly cwd: string;

  /**
   * Optional project root path supplied by the caller. Relative paths are
   * resolved from `cwd`.
   */
  readonly requestedProjectRoot?: string;
}
