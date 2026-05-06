import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile } from '../types';

export function detect(dir: string): DetectedAgent[] {
  const result: DetectedAgent[] = [];
  if (fs.existsSync(path.join(dir, '.windsurf', 'rules'))) {
    result.push({ name: 'windsurf', confidence: 'high' });
  }
  if (
    fs.existsSync(path.join(dir, '.windsurf-cli', 'rules')) ||
    fs.existsSync(path.join(dir, '.WindsurfCLI', 'rules')) ||
    fs.existsSync(path.join(dir, '.devin', 'rules'))
  ) {
    result.push({ name: 'windsurf-cli', confidence: 'high' });
  }
  return result;
}

const TRIGGER_MAP: Record<string, string> = {
  always_on: 'always',
  glob: 'scoped',
  model_decision: 'ai-decided',
  manual: 'manual',
};

export class WindsurfInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = ['windsurf', 'windsurf-cli'];
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];
    
    // Check all possible rules directories
    const rulesDirs = [
      path.join(projectRoot, '.windsurf', 'rules'),
      path.join(projectRoot, '.windsurf-cli', 'rules'),
      path.join(projectRoot, '.WindsurfCLI', 'rules'),
      path.join(projectRoot, '.devin', 'rules'),
    ];

    for (const rulesDir of rulesDirs) {
      if (!fs.existsSync(rulesDir)) continue;

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
          const agentName = rulesDir.includes('.windsurf-cli') || rulesDir.includes('.WindsurfCLI') || rulesDir.includes('.devin') 
            ? 'WindsurfCLI' : 'Windsurf';
          inst.importNote =
            `# TODO: verify activation — unknown ${agentName} trigger "${trigger}"`;
        }

        if (parseWarning && !inst.importNote) inst.importNote = parseWarning;

        instructions.push(inst);
      }
    }

    return instructions;
  }
}

export default [
  new WindsurfInstructionImporter(),
];
