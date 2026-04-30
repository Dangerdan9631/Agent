/** Shared utility functions used by both parsers and generators */

import matter from 'gray-matter';

/** Result of {@link safeMatter} — `data` and `content` match gray-matter's contract. */
export interface SafeMatterResult {
  data: Record<string, unknown>;
  content: string;
  /**
   * Set when the YAML frontmatter could not be parsed even after auto-fix attempts.
   * Callers should surface this as an `importNote` on the resulting directive so the
   * problem is visible after import rather than silently discarded.
   */
  parseWarning?: string;
}

/**
 * Preprocess a raw file so that scalar values containing unquoted colons are
 * wrapped in single quotes before js-yaml sees them.  Example:
 *   description: Ui types: actions, handlers
 *   → description: 'Ui types: actions, handlers'
 */
function fixUnquotedColons(raw: string): string {
  return raw.replace(
    // Match frontmatter block at the very start of the file (no `m` flag → `^` = start of string)
    /^(---[ \t]*\r?\n)([\s\S]*?)(\n---(?:[ \t]*)(?:\r?\n|$))/,
    (_, open: string, block: string, close: string) => {
      const fixed = block.replace(
        // Match "key: value-that-contains-a-colon" lines where value is not already quoted/structured
        /^([ \t]*[\w-]+:[ \t]+)([^'"[{|>\r\n][^\r\n]*:[^\r\n]*)$/gm,
        (_: string, prefix: string, val: string) =>
          `${prefix}'${val.trimEnd().replace(/'/g, "''")}'`,
      );
      return `${open}${fixed}${close}`;
    },
  );
}

/**
 * Parse frontmatter with a three-level recovery strategy:
 *   1. Normal parse — succeeds for valid YAML.
 *   2. Auto-fix unquoted colons in scalar values and retry — handles the common
 *      case where agent files use bare colons in `description:` values.
 *   3. Strip the frontmatter block entirely, preserve the body, and set
 *      `parseWarning` so callers can surface the problem as an `importNote`.
 */
export function safeMatter(raw: string): SafeMatterResult {
  try {
    const { data, content } = matter(raw);
    return { data: data as Record<string, unknown>, content };
  } catch { /* fall through to preprocessing */ }

  try {
    const { data, content } = matter(fixUnquotedColons(raw));
    return { data: data as Record<string, unknown>, content };
  } catch { /* fall through to final fallback */ }

  const body = raw.replace(/^---[ \t]*\r?\n[\s\S]*?\n---[ \t]*(?:\r?\n|$)/, '').trimStart();
  return {
    data: {},
    content: body,
    parseWarning:
      '# TODO: verify activation — YAML frontmatter could not be parsed; check source file',
  };
}

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
