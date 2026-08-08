import type { CatalogClock } from '@atlas-example/application';

/**
 * Supplies a deterministic timestamp for the reproducible example application.
 */
export class FixedCatalogClock implements CatalogClock {
  /**
   * Creates a clock from one retained timestamp value.
   *
   * @param timestamp - Valid date copied on reads.
   */
  public constructor(private readonly timestamp: Date) {
    if (Number.isNaN(timestamp.valueOf())) {
      throw new Error('Fixed catalog clock requires a valid timestamp.');
    }
  }

  /**
   * Reads the configured timestamp without sharing mutable date state.
   *
   * @returns Copy of the configured timestamp.
   */
  public now(): Date {
    return new Date(this.timestamp);
  }
}
