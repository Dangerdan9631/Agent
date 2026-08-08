import type { CatalogItem } from '@atlas-example/domain';

/**
 * Reports the immutable result of one catalog import use case.
 */
export class CatalogImportReport {
  /**
   * Creates an import report.
   *
   * @param importedAt - Timestamp supplied by the application clock.
   * @param items - Items created and persisted by this import.
   */
  public constructor(
    public readonly importedAt: Date,
    public readonly items: readonly CatalogItem[],
  ) {}

  /**
   * Counts imported items without exposing a mutable collection.
   *
   * @returns Number of imported catalog items.
   */
  public get importedCount(): number {
    return this.items.length;
  }
}
