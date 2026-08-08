import { CatalogItem } from './CatalogItem.js';
import type { CatalogItemId } from './CatalogItemId.js';
import { CatalogItemKind } from './CatalogItemKind.js';

/**
 * Represents a book entry authored by one catalog contributor.
 */
export class BookCatalogItem extends CatalogItem {
  /**
   * Creates a normalized book catalog item.
   *
   * @param id - Stable catalog identifier.
   * @param title - Normalized book title.
   * @param author - Non-empty author display name.
   */
  public constructor(
    id: CatalogItemId,
    title: string,
    public readonly author: string,
  ) {
    super(id, title, CatalogItemKind.Book);
  }

  /**
   * Describes the book and its author.
   *
   * @returns Readable book description.
   */
  public override describe(): string {
    return `${this.title} by ${this.author}`;
  }
}
