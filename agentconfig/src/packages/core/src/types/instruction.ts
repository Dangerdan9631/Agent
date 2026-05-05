import type { ValidationResult } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';

export type ActivationType = 'always' | 'scoped' | 'ai-decided' | 'manual';

export class InstructionFile implements InstructionType {
  readonly typeId = 'instruction';

  constructor(
    public name: string,
    public sourcePath: string,
    public activation: ActivationType,
    public body: string,
    public slug: string,
    public globs?: string[],
    public description?: string,
    public targets?: string[],
    public excludedTargets?: string[],
    public importNote?: string,
  ) {}

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!this.name) results.push({ level: 'error', message: 'name is required' });
    if (!this.body) results.push({ level: 'warning', message: 'body is empty' });
    if (this.activation === 'scoped' && (!this.globs || this.globs.length === 0)) {
      results.push({ level: 'error', message: 'scoped activation requires globs' });
    }
    if (this.activation === 'ai-decided' && !this.description) {
      results.push({ level: 'error', message: 'ai-decided activation requires description' });
    }
    return results;
  }
}
