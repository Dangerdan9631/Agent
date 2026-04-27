import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import fg from 'fast-glob';
import type { InstructionFile } from '../types/ir';
import type { DetectedAgent } from '../types/generator';

/** Detect whether a Cline configuration is present in `dir`. */
export function detectCline(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.clinerules'))) {
    return [{ name: 'cline', confidence: 'high' }];
  }
  return [];
}

const IN_TEXT_PREFIX = '> **Apply only when:**';

function isAiDecidedBody(body: string): boolean {
  return body.trimStart().startsWith(IN_TEXT_PREFIX);
}

function extractDescription(body: string): string {
  return (body.trimStart().split('\n')[0] ?? '')
    .replace(/^>\s*\*\*Apply only when:\*\*\s*/, '')
    .trim();
}

function stripInTextCondition(body: string): string {
  return body.trimStart().split('\n').slice(2).join('\n').trimStart();
}

/**
 * Import instructions from a Cline project.
 * Reads .clinerules/*.md:
 *   no frontmatter          → always
 *   paths: [...] frontmatter → scoped
 *   in-text condition body  → ai-decided (heuristic)
 *   otherwise               → always with note
 */
export async function importCline(
  sourceDir: string,
): Promise<{ instructions: InstructionFile[] }> {
  const instructions: InstructionFile[] = [];
  const rulesDir = path.join(sourceDir, '.clinerules');
  if (!fs.existsSync(rulesDir)) return { instructions };

  const files = await fg('**/*.{md,txt}', { cwd: rulesDir, absolute: true });

  for (const filePath of files.sort()) {
    // Skip subdirectories used for workflows/hooks
    const rel = path.relative(rulesDir, filePath).replace(/\\/g, '/');
    if (rel.startsWith('workflows/') || rel.startsWith('hooks/')) continue;

    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    const stem = path.basename(filePath).replace(/\.(md|txt)$/, '');
    const body = content.trim();
    const hasFrontmatter = Object.keys(data).length > 0;

    if (!hasFrontmatter) {
      // No frontmatter → always active (or ai-decided via in-text condition heuristic)
      if (isAiDecidedBody(body)) {
        const description = extractDescription(body);
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: 'ai-decided',
          description,
          slug: stem,
          body: stripInTextCondition(body),
          importNote:
            '# TODO: verify activation — ai-decided inferred from in-text condition prefix',
        });
      } else {
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: 'always',
          slug: stem,
          body,
        });
      }
    } else if (Array.isArray(data.paths)) {
      // paths: [...] → scoped
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'scoped',
        globs: data.paths as string[],
        slug: stem,
        body,
      });
    } else {
      // Unknown frontmatter
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'always',
        slug: stem,
        body,
        importNote: '# TODO: verify activation — unrecognized Cline frontmatter',
      });
    }
  }

  return { instructions };
}
