import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile } from '../types';

export function detectWindsurfCli(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.WindsurfCLI', 'rules'))) {
    return [{ name: 'WindsurfCLI', confidence: 'high' }];
  }
  return [];
}

const TRIGGER_MAP: Record<string, string> = {
  always_on: 'always',
  glob: 'scoped',
  model_decision: 'ai-decided',
  manual: 'manual',
};

export class WindsurfCLIInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = 'WindsurfCLI';
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];
    const rulesDir = path.join(projectRoot, '.WindsurfCLI', 'rules');
    if (!fs.existsSync(rulesDir)) return instructions;

    const files = await fg('**/*.md', { cwd: rulesDir, absolute: true });

    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content, parseWarning } = matter(raw);
      const stem = path.basename(filePath, '.md');
      const body = content.trim();

      const trigger = typeof data.trigger === 'string' ? data.trigger : 'always_on';
      const activation = (TRIGGER_MAP[trigger] ?? 'always') as any;

      const inst = new InstructionFile(
        stem,
        filePath,
        activation,
        body,
        stem,
      );

      if (activation === 'scoped') {
        const rawGlobs = typeof data.globs === 'string' ? data.globs : '';
        inst.globs = rawGlobs
          .split(',')
          .map((g: string) => g.trim())
          .filter(Boolean);
      } else if (activation === 'ai-decided') {
        inst.description =
          typeof data.description === 'string' ? data.description : undefined;
      }

      if (!TRIGGER_MAP[trigger]) {
        inst.importNote =
          `# TODO: verify activation — unknown WindsurfCLI trigger "${trigger}"`;
      }

      if (parseWarning && !inst.importNote) inst.importNote = parseWarning;

      instructions.push(inst);
    }

    return instructions;
  }
}

export default [
  new WindsurfCLIInstructionImporter(),
];


