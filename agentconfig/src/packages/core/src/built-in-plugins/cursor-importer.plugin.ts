import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile } from '../types';

export function detect(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.cursor', 'rules'))) {
    return [{ name: 'cursor', confidence: 'high' }];
  }
  return [];
}

export class CursorInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = 'cursor';
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];
    const rulesDir = path.join(projectRoot, '.cursor', 'rules');
    if (!fs.existsSync(rulesDir)) return instructions;

    const files = await fg('**/*.{mdc,md}', { cwd: rulesDir, absolute: true });

    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content, parseWarning } = matter(raw);
      const stem = path.basename(filePath).replace(/\.(mdc|md)$/, '');
      const body = content.trim();

      const hasFrontmatter = Object.keys(data).length > 0 || !!parseWarning;

      if (!hasFrontmatter) {
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'manual',
          body,
          stem,
        ));
        continue;
      }

      if (data.alwaysApply === true) {
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'always',
          body,
          stem,
        ));
      } else if (data.globs !== undefined && data.globs !== '') {
        const rawGlobs = typeof data.globs === 'string' ? data.globs : String(data.globs);
        const globs = rawGlobs.split(',').map((g: string) => g.trim()).filter(Boolean);
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'scoped',
          body,
          stem,
          globs,
        ));
      } else if (typeof data.description === 'string' && data.description) {
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'ai-decided',
          body,
          stem,
          undefined,
          data.description,
        ));
      } else {
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'always',
          body,
          stem,
          undefined,
          undefined,
          undefined,
          undefined,
          parseWarning ?? '# TODO: verify activation — could not determine from Cursor frontmatter'
        ));
      }
    }

    return instructions;
  }
}

export default [
  new CursorInstructionImporter(),
];
