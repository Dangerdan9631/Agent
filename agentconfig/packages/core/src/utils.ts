/** Shared utility functions used by both parsers and generators */

/**
 * Convert a name to a URL-safe slug (lowercase, hyphens only).
 * e.g. "01-Coding Standards" → "01-coding-standards"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
