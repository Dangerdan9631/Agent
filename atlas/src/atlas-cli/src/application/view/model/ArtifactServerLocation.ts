/**
 * Identifies the reachable local URL for one active Atlas artifact server.
 */
export class ArtifactServerLocation {
  /**
   * Creates the user-facing location for an active artifact server.
   *
   * @param url - Absolute HTTP URL that opens the workspace landscape diagram.
   */
  public constructor(public readonly url: string) {}
}
