import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import type { InstructionFile } from '../types/ir';

/**
 * Import instructions from a Gemini CLI project.
 * Reads:
 *   GEMINI.md                        → always instruction
 *   .gemini/instructions/*.md        → manual instruction
 */
export async function importGeminiCli(
  sourceDir: string,
): Promise<{ instructions: InstructionFile[] }> {
  const instructions: InstructionFile[] = [];

  // Always: GEMINI.md
  const geminiMd = path.join(sourceDir, 'GEMINI.md');
  if (fs.existsSync(geminiMd)) {
    const body = fs.readFileSync(geminiMd, 'utf8').trim();
    if (body) {
      instructions.push({
        name: 'gemini',
        sourcePath: geminiMd,
        activation: 'always',
        slug: 'gemini',
        body,
        importNote:
          '# TODO: verify activation — GEMINI.md may contain mixed always + ai-decided sections',
      });
    }
  }

  // Manual: .gemini/instructions/
  const instrDir = path.join(sourceDir, '.gemini', 'instructions');
  if (fs.existsSync(instrDir)) {
    const files = await fg('**/*.md', { cwd: instrDir, absolute: true });
    for (const filePath of files.sort()) {
      const body = fs.readFileSync(filePath, 'utf8').trim();
      const stem = path.basename(filePath, '.md');
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'manual',
        slug: stem,
        body,
      });
    }
  }

  return { instructions };
}
