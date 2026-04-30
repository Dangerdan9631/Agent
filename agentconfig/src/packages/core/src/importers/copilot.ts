import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { InstructionFile } from '../types/ir';
import type { DetectedAgent } from '../types/generator';


/** Detect whether a Copilot configuration is present in `dir`. */
export function detectCopilot(dir: string): DetectedAgent[] {
  if (
    fs.existsSync(path.join(dir, '.github', 'copilot-instructions.md')) ||
    fs.existsSync(path.join(dir, '.github', 'instructions'))
  ) {
    return [{ name: 'copilot', confidence: 'high' }];
  }
  return [];
}

const IN_TEXT_PREFIX = '> **Apply only when:**';

function isAiDecidedBody(body: string): boolean {
  return body.trimStart().startsWith(IN_TEXT_PREFIX);
}

function extractDescriptionFromBody(body: string): string {
  const line = body.trimStart().split('\n')[0] ?? '';
  return line.replace(/^>\s*\*\*Apply only when:\*\*\s*/, '').trim();
}

function stripInTextCondition(body: string): string {
  const lines = body.trimStart().split('\n');
  // Remove the first line (the condition) and the following blank line
  return lines.slice(2).join('\n').trimStart();
}

/**
 * Import instructions from a Copilot project.
 * Reads:
 *  - .github/copilot-instructions.md         → always
 *  - .github/instructions/*.instructions.md  → scoped or ai-decided
 *  - .github/prompts/*.prompt.md             → manual
 */
export async function importCopilot(
  sourceDir: string,
): Promise<{ instructions: InstructionFile[] }> {
  const instructions: InstructionFile[] = [];

  // Always: repository-wide instructions
  const globalFile = path.join(sourceDir, '.github', 'copilot-instructions.md');
  if (fs.existsSync(globalFile)) {
    const body = fs.readFileSync(globalFile, 'utf8').trim();
    if (body) {
      instructions.push({
        name: 'copilot-instructions',
        sourcePath: globalFile,
        activation: 'always',
        slug: 'copilot-instructions',
        body,
      });
    }
  }

  // Path-specific instructions
  const instrDir = path.join(sourceDir, '.github', 'instructions');
  if (fs.existsSync(instrDir)) {
    const files = await fg('**/*.instructions.md', { cwd: instrDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content, parseWarning } = matter(raw);
      const body = content.trim();
      const stem = path.basename(filePath, '.instructions.md');

      const applyTo = typeof data.applyTo === 'string' ? data.applyTo : '**/*';

      if (applyTo === '**/*') {
        // Could be ai-decided (in-text condition) or generic always
        if (isAiDecidedBody(body)) {
          const description = extractDescriptionFromBody(body);
          const cleanBody = stripInTextCondition(body);
          instructions.push({
            name: stem,
            sourcePath: filePath,
            activation: 'ai-decided',
            slug: stem,
            description,
            body: cleanBody,
            importNote: 'activation inferred from applyTo: **/* + in-text condition',
          });
        } else {
          instructions.push({
            name: stem,
            sourcePath: filePath,
            activation: 'always',
            slug: stem,
            body,
            importNote: parseWarning ?? 'activation inferred from applyTo: **/*; verify if scoped was intended',
          });
        }
      } else {
        // Scoped
        const globs = applyTo.split(',').map((g: string) => g.trim()).filter(Boolean);
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: 'scoped',
          globs,
          slug: stem,
          body,
        });
      }
    }
  }

  // Manual: prompt files
  const promptsDir = path.join(sourceDir, '.github', 'prompts');
  if (fs.existsSync(promptsDir)) {
    const files = await fg('**/*.prompt.md', { cwd: promptsDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { content } = matter(raw);
      const stem = path.basename(filePath, '.prompt.md');
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'manual',
        slug: stem,
        body: content.trim(),
      });
    }
  }

  return { instructions };
}
