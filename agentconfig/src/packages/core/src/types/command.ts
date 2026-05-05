import type { ValidationResult } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';

export class CommandDefinition implements InstructionType {
  readonly typeId = 'command';

  constructor(
    public name: string,
    public slug: string,
    public sourcePath: string,
    public body: string,
    public targets?: string[],
    public excludedTargets?: string[],
  ) {}

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!this.name) results.push({ level: 'error', message: 'name is required' });
    if (!this.slug) results.push({ level: 'error', message: 'slug is required' });
    if (!this.body) results.push({ level: 'warning', message: 'body is empty' });
    return results;
  }
}
