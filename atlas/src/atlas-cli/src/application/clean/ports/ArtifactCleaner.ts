/**
 * Removes regenerable children contained by one resolved Atlas artifact root.
 */
export interface ArtifactCleaner {
  /**
   * Removes all direct children while retaining the root directory itself.
   *
   * @param artifactRootPath - Absolute artifact root whose direct children may be removed.
   * @returns Count of direct children removed.
   */
  clean(artifactRootPath: string): Promise<number>;
}
