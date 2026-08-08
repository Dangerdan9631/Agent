import { BookCatalogItem } from './BookCatalogItem.js';
import type { CatalogItem } from './CatalogItem.js';
import type { CatalogItemDraft } from './CatalogItemDraft.js';
import { CatalogItemKind } from './CatalogItemKind.js';
import type { CatalogTitlePolicy } from './CatalogTitlePolicy.js';
import { WorkshopCatalogItem } from './WorkshopCatalogItem.js';
import { createCatalogItemId } from './createCatalogItemId.js';

/**
 * Creates concrete catalog item specializations from validated drafts.
 */
export class CatalogItemFactory {
  /**
   * Creates the factory with its title normalization policy.
   *
   * @param titlePolicy - Domain policy applied to every item title.
   */
  public constructor(private readonly titlePolicy: CatalogTitlePolicy) {}

  /**
   * Creates one specialized item from a catalog draft.
   *
   * @param draft - Validated seed values supplied by an application boundary.
   * @returns Concrete book or workshop catalog item.
   */
  public create(draft: CatalogItemDraft): CatalogItem {
    const id = createCatalogItemId(draft.id);
    const title = this.titlePolicy.normalize(draft.title);
    if (draft.kind === CatalogItemKind.Book) {
      return new BookCatalogItem(id, title, draft.contributor);
    }
    return new WorkshopCatalogItem(id, title, draft.contributor);
  }
}
