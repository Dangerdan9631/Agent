/**
 * Normalizes human-entered titles without exposing a persistence or presentation concern.
 */
export interface CatalogTitlePolicy {
  /**
   * Produces a non-empty display title from an untrusted candidate.
   *
   * @param candidate - Title text that may contain inconsistent spacing or casing.
   * @returns Normalized title suitable for a catalog item.
   */
  normalize(candidate: string): string;
}
