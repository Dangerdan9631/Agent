import type { CatalogItemDraft } from '@atlas-example/domain';

/**
 * Loads validated seed drafts from an external representation.
 */
export interface CatalogSeedReader {
  /**
   * Reads all drafts available to the current import operation.
   *
   * @returns Validated catalog drafts in document order.
   */
  read(): readonly CatalogItemDraft[];
}
