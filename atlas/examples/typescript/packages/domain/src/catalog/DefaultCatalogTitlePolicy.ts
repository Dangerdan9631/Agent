import type { CatalogTitlePolicy } from './CatalogTitlePolicy.js';

/**
 * Applies the catalog's default whitespace and leading-capital title policy.
 */
export class DefaultCatalogTitlePolicy implements CatalogTitlePolicy {
  /**
   * Normalizes one candidate while rejecting blank titles.
   *
   * @param candidate - User-owned title text.
   * @returns Collapsed, leading-capital title text.
   */
  public normalize(candidate: string): string {
    const collapsed = candidate.trim().replaceAll(/\s+/g, ' ');
    if (collapsed.length === 0) {
      throw new Error('Catalog item title must not be blank.');
    }
    return `${collapsed[0]?.toLocaleUpperCase()}${collapsed.slice(1)}`;
  }
}
