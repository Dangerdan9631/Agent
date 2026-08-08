import type { CatalogRepository } from '@atlas-example/application';
import type { CatalogItem } from '@atlas-example/domain';
import { orderBy } from 'lodash-es';

/**
 * Stores catalog items in memory while preserving deterministic query ordering.
 */
export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly items = new Map<string, CatalogItem>();

  /**
   * Stores or replaces one item by identity.
   *
   * @param item - Valid domain item.
   */
  public save(item: CatalogItem): void {
    this.items.set(item.id, item);
  }

  /**
   * Lists stored items by normalized title and identifier.
   *
   * @returns Immutable deterministic item view.
   */
  public list(): readonly CatalogItem[] {
    return orderBy(
      [...this.items.values()],
      [(item) => item.title.toLocaleLowerCase(), (item) => item.id],
      ['asc', 'asc'],
    );
  }
}
