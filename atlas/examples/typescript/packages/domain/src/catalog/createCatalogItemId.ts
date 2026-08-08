import type { CatalogItemId } from './CatalogItemId.js';

/**
 * Converts an external identifier into the stable catalog identifier format.
 *
 * @param candidate - Untrusted identifier text.
 * @returns Lowercase dash-separated non-empty identifier.
 */
export function createCatalogItemId(candidate: string): CatalogItemId {
  const identifier = candidate
    .trim()
    .toLocaleLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
  if (identifier.length === 0) {
    throw new Error('Catalog item id must contain a letter or digit.');
  }
  return identifier;
}
