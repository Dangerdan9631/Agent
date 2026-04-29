import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { InstructionFile } from '../types/ir';
import type { DetectedAgent } from '../types/generator';

/** Detect whether a Cursor configuration is present in `dir`. */
export function detectCursor(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.cursor', 'rules'))) {
    return [{ name: 'cursor', confidence: 'high' }];
  }
  return [];
}

/**
 * Import instructions from a Cursor project.
 * Reads .cursor/rules/*.mdc and infers activation from frontmatter:
 *   alwaysApply: true              → always
 *   globs: "..." + alwaysApply: false → scoped
 *   description: "..." + alwaysApply: false → ai-decided
 *   (no frontmatter)               → manual
 */
export async function importCursor(
  sourceDir: string,
): Promise<{ instructions: InstructionFile[] }> {
  const instructions: InstructionFile[] = [];
  const rulesDir = path.join(sourceDir, '.cursor', 'rules');
  if (!fs.existsSync(rulesDir)) return { instructions };

  const files = await fg('**/*.{mdc,md}', { cwd: rulesDir, absolute: true });

  for (const filePath of files.sort()) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content, parseWarning } = matter(raw);
    const stem = path.basename(filePath).replace(/\.(mdc|md)$/, '');
    const body = content.trim();

    const hasFrontmatter = Object.keys(data).length > 0 || !!parseWarning;

    if (!hasFrontmatter) {
      // Manual rule — @mention only
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'manual',
        slug: stem,
        body,
      });
      continue;
    }

    if (data.alwaysApply === true) {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'always',
        slug: stem,
        body,
      });
    } else if (data.globs !== undefined && data.globs !== '') {
      const rawGlobs = typeof data.globs === 'string' ? data.globs : String(data.globs);
      const globs = rawGlobs.split(',').map((g: string) => g.trim()).filter(Boolean);
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'scoped',
        globs,
        slug: stem,
        body,
      });
    } else if (typeof data.description === 'string' && data.description) {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'ai-decided',
        description: data.description,
        slug: stem,
        body,
      });
    } else {
      // Unknown frontmatter — fall back to always with a note
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'always',
        slug: stem,
        body,
        importNote: parseWarning ?? '# TODO: verify activation — could not determine from Cursor frontmatter',
      });
    }
  }

  return { instructions };
}
