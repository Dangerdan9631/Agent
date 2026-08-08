import type { CatalogItemId } from './CatalogItemId.js';
import type { CatalogItemKind } from './CatalogItemKind.js';

/**
 * Defines the common identity and descriptive behavior of every catalog item.
 */
export abstract class CatalogItem {
  /**
   * Creates an item from values already normalized by the domain factory.
   *
   * @param id - Stable non-empty catalog identifier.
   * @param title - Normalized human-readable title.
   * @param kind - Concrete item specialization.
   */
  protected constructor(
    public readonly id: CatalogItemId,
    public readonly title: string,
    public readonly kind: CatalogItemKind,
  ) {}

  /**
   * Describes the specialized catalog content.
   *
   * @returns Concise user-facing item description.
   */
  public abstract describe(): string;
}
