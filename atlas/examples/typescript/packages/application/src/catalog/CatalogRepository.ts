import type { CatalogItem } from '@atlas-example/domain';

/**
 * Persists and retrieves catalog items for application use cases.
 */
export interface CatalogRepository {
  /**
   * Stores one item by stable identity.
   *
   * @param item - Domain item that replaces any item with the same identifier.
   */
  save(item: CatalogItem): void;

  /**
   * Lists all stored items in repository-defined deterministic order.
   *
   * @returns Immutable item view.
   */
  list(): readonly CatalogItem[];
}
