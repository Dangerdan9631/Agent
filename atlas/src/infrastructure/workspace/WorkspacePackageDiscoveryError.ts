/**
 * Describes an unsafe, ambiguous, or incomplete workspace package discovery result.
 */
export class WorkspacePackageDiscoveryError extends Error {
  /**
   * Creates an actionable discovery failure explanation.
   *
   * @param detail - Concise explanation of the discovery invariant that failed.
   */
  public constructor(detail: string) {
    super(`Atlas workspace discovery error: ${detail}`);
    this.name = 'WorkspacePackageDiscoveryError';
  }
}
