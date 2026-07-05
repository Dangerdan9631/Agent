/**
 * Captures a project root detection result.
 */
export interface ProjectRootResolution {
  /**
   * Absolute resolved project root. Omitted when no `.spec-n-roll` directory
   * can be found.
   */
  readonly projectRoot?: string;

  /**
   * Absolute directory where discovery started. Must be the provided root path
   * or the caller current working directory.
   */
  readonly searchStartDirectory: string;
}
