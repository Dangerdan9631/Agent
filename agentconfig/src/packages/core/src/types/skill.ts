import type { ValidationResult } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';

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
