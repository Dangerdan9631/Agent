import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile } from '../types';

export function detectGeminiCli(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.gemini')) || fs.existsSync(path.join(dir, 'GEMINI.md'))) {
    return [{ name: 'gemini-cli', confidence: 'high' }];
  }
  return [];
}

export class GeminiCliInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = 'gemini-cli';
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];

    // Always: GEMINI.md
    const geminiMd = path.join(projectRoot, 'GEMINI.md');
    if (fs.existsSync(geminiMd)) {
      const body = fs.readFileSync(geminiMd, 'utf8').trim();
      if (body) {
        instructions.push(new InstructionFile(
          'gemini',
          geminiMd,
          'always',
          body,
          'gemini',
          undefined,
          undefined,
          undefined,
          undefined,
          '# TODO: verify activation — GEMINI.md may contain mixed always + ai-decided sections'
        ));
      }
    }

    // Manual: .gemini/instructions/
    const instrDir = path.join(projectRoot, '.gemini', 'instructions');
    if (fs.existsSync(instrDir)) {
      const files = await fg('**/*.md', { cwd: instrDir, absolute: true });
      for (const filePath of files.sort()) {
        const body = fs.readFileSync(filePath, 'utf8').trim();
        const stem = path.basename(filePath, '.md');
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'manual',
          body,
          stem,
        ));
      }
    }

    return instructions;
  }
}

export default [
  new GeminiCliInstructionImporter(),
];
