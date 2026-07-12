import { existsSync, readFileSync } from 'node:fs';

/**
 * Determines whether an extension file is owned by the Spec-N-Roll framework.
 */
export class FrameworkExtensionOwnership {
  /**
   * Checks the leading YAML frontmatter comment for framework authorship.
   *
   * @param filePath - Absolute extension file path to inspect.
   * @returns true when the file declares `metadata.author: spec-n-roll`.
   */
  isFrameworkOwned(filePath: string): boolean {
    if (!existsSync(filePath)) return false;
    const source = readFileSync(filePath, 'utf8');
    const match = source.match(/^\/\*\s*\r?\n---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n\*\//);
    return match != null && /metadata:\s*\r?\n\s*author:\s*['"]spec-n-roll['"]/.test(match[1]);
  }
}
