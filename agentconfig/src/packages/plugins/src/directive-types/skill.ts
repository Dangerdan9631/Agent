import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DirectiveTypePlugin, ValidationResult, WriteOptions } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';
import { parseSkills } from '../directive-parsers/skill';

export interface SkillFile {
  relativePath: string;
  content: string;
}

export class SkillDefinition implements InstructionType {
  readonly typeId = 'skill';

  constructor(
    public name: string,
    public sourcePath: string,
    public files: SkillFile[],
  ) {}

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!this.name) results.push({ level: 'error', message: 'name is required' });
    if (!this.files || this.files.length === 0) {
      results.push({ level: 'warning', message: 'skill has no files' });
    }
    return results;
  }
}

function writeFile(filePath: string, content: string, opts?: WriteOptions): void {
  if (opts?.overwrite === false && fs.existsSync(filePath)) return;
  if (opts?.dryRun) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export const skillDirectiveTypePlugin: DirectiveTypePlugin<SkillDefinition> = {
  typeId: 'skill',
  displayName: 'Skills',
  parse(configDir: string): SkillDefinition[] {
    return parseSkills(configDir);
  },
  write(items: SkillDefinition[], configDir: string, opts?: WriteOptions): void {
    for (const skill of items) {
      for (const file of skill.files) {
        writeFile(path.join(configDir, 'skills', skill.name, file.relativePath), file.content, opts);
      }
    }
  },
  validate(items: SkillDefinition[]): ValidationResult[] {
    void items;
    return [];
  },
};
