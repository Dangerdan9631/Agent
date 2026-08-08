/**
 * Supplies application time without coupling use cases to the host clock.
 */
export interface CatalogClock {
  /**
   * Reads the current application timestamp.
   *
   * @returns Timestamp owned by the caller and safe to retain.
   */
  now(): Date;
}
