import type { CatalogItemKind } from './CatalogItemKind.js';

/**
 * Carries validated catalog seed data into the domain factory.
 */
export interface CatalogItemDraft {
  readonly id: string;
  readonly title: string;
  readonly kind: CatalogItemKind;
  readonly contributor: string;
}
