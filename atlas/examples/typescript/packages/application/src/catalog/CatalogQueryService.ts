import type { CatalogItem } from '@atlas-example/domain';
import type { CatalogRepository } from './CatalogRepository.js';
import { DEFAULT_CATALOG_LIMIT } from './DefaultCatalogLimit.js';

/**
 * Provides bounded catalog queries to delivery-layer callers.
 */
export class CatalogQueryService {
  /**
   * Creates queries over one repository boundary.
   *
   * @param repository - Catalog storage abstraction.
   */
  public constructor(private readonly repository: CatalogRepository) {}

  /**
   * Lists a bounded number of catalog items.
   *
   * @param limit - Positive maximum result count.
   * @returns Deterministically ordered item view.
   */
  public list(limit = DEFAULT_CATALOG_LIMIT): readonly CatalogItem[] {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('Catalog query limit must be a positive integer.');
    }
    return this.repository.list().slice(0, limit);
  }
}
