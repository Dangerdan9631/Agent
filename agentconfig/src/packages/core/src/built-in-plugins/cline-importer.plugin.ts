import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile } from '../types';

export function detect(dir: string): DetectedAgent[] {
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

export class ClineInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = 'cline';
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];
    const rulesDir = path.join(projectRoot, '.clinerules');
    if (!fs.existsSync(rulesDir)) return instructions;

    const files = await fg('**/*.{md,txt}', { cwd: rulesDir, absolute: true });

    for (const filePath of files.sort()) {
      // Skip subdirectories used for workflows/hooks
      const rel = path.relative(rulesDir, filePath).replace(/\\/g, '/');
      if (rel.startsWith('workflows/') || rel.startsWith('hooks/')) continue;

      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content, parseWarning } = matter(raw);
      const stem = path.basename(filePath).replace(/\.(md|txt)$/, '');
      const body = content.trim();
      const hasFrontmatter = Object.keys(data).length > 0 || !!parseWarning;

      if (!hasFrontmatter) {
        if (isAiDecidedBody(body)) {
          const description = extractDescription(body);
          instructions.push(new InstructionFile(
            stem,
            filePath,
            'ai-decided',
            stripInTextCondition(body),
            stem,
            undefined,
            description,
            undefined,
            undefined,
            '# TODO: verify activation — ai-decided inferred from in-text condition prefix',
          ));
        } else {
          instructions.push(new InstructionFile(
            stem,
            filePath,
            'always',
            body,
            stem,
          ));
        }
      } else if (Array.isArray(data.paths)) {
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'scoped',
          body,
          stem,
          data.paths as string[],
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
          parseWarning ?? '# TODO: verify activation — unrecognized Cline frontmatter',
        ));
      }
    }

    return instructions;
  }
}

export default [
  new ClineInstructionImporter(),
];
