import { CatalogItem } from './CatalogItem.js';
import type { CatalogItemId } from './CatalogItemId.js';
import { CatalogItemKind } from './CatalogItemKind.js';

/**
 * Represents an instructor-led workshop in the catalog.
 */
export class WorkshopCatalogItem extends CatalogItem {
  /**
   * Creates a normalized workshop catalog item.
   *
   * @param id - Stable catalog identifier.
   * @param title - Normalized workshop title.
   * @param facilitator - Non-empty facilitator display name.
   */
  public constructor(
    id: CatalogItemId,
    title: string,
    public readonly facilitator: string,
  ) {
    super(id, title, CatalogItemKind.Workshop);
  }

  /**
   * Describes the workshop and its facilitator.
   *
   * @returns Readable workshop description.
   */
  public override describe(): string {
    return `${this.title}, facilitated by ${this.facilitator}`;
  }
}
