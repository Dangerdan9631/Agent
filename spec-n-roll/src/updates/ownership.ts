/**
 * Represents the owner of a file to distinguish between toolkit-managed
 * and user-owned files during updates.
 */
export type FileOwner = 'toolkit' | 'user';

/**
 * Normalizes a path to use forward slashes and remove trailing slashes
 * to ensure consistent path comparisons.
 *
 * @param relativePath - The path to normalize. Must be a non-empty string.
 * @returns The normalized path string.
 */
function normalizePath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/\/+$/, '') || '.';
}

/**
 * Checks if a normalized path matches a prefix exactly or as a parent directory
 * to support hierarchical path matching.
 *
 * @param normalized - The normalized path to check.
 * @param prefix - The prefix path to match against.
 * @returns true if the path matches the prefix, false otherwise.
 */
function matchesPrefix(normalized: string, prefix: string): boolean {
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
}

/**
 * Path prefixes that are owned by the user and should not be overwritten
 * during toolkit updates.
 */
const USER_OWNED_PREFIXES = ['.spec-n-roll/config', 'specs', 'living-specs'] as const;

/**
 * Path prefixes that are owned by the toolkit and can be safely overwritten
 * during toolkit updates.
 */
const TOOLKIT_OWNED_PREFIXES = ['.spec-n-roll', '.agents'] as const;

/**
 * Classifies a path as toolkit-owned, user-owned, or neither based on
 * its prefix to determine update behavior.
 *
 * @param relativePath - The relative path to classify. Must be a non-empty string.
 * @returns The file owner or null if the path is not classified.
 */
export function classifyPath(relativePath: string): FileOwner | null {
  const normalized = normalizePath(relativePath);

  for (const prefix of USER_OWNED_PREFIXES) {
    if (matchesPrefix(normalized, prefix)) {
      return 'user';
    }
  }

  for (const prefix of TOOLKIT_OWNED_PREFIXES) {
    if (matchesPrefix(normalized, prefix)) {
      return 'toolkit';
    }
  }

  return null;
}

/**
 * Checks if a path is toolkit-owned to determine if it can be safely
 * overwritten during updates.
 *
 * @param relativePath - The relative path to check. Must be a non-empty string.
 * @returns true if the path is toolkit-owned, false otherwise.
 */
export function isToolkitOwned(relativePath: string): boolean {
  return classifyPath(relativePath) === 'toolkit';
}

/**
 * Checks if a path is user-owned to determine if it should be preserved
 * during updates.
 *
 * @param relativePath - The relative path to check. Must be a non-empty string.
 * @returns true if the path is user-owned, false otherwise.
 */
export function isUserOwned(relativePath: string): boolean {
  return classifyPath(relativePath) === 'user';
}
