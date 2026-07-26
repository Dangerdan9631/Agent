/**
 * Describes an invalid workspace, configuration, or artifact-root command-line path.
 */
export class WorkspacePathResolutionError extends Error {
  /**
   * Creates an actionable path resolution failure.
   *
   * @param detail - Concise explanation of the invalid path selection.
   */
  public constructor(detail: string) {
    super(`Atlas path resolution error: ${detail}`);
    this.name = 'WorkspacePathResolutionError';
  }
}
