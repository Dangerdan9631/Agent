import type { ValidationResult } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';

export class AgentDefinition implements InstructionType {
  readonly typeId = 'agent';

  constructor(
    public name: string,
    public sourcePath: string,
    public body: string,
    public description?: string,
    public model?: string,
    public tools?: string[],
    public targets?: string[],
    public excludedTargets?: string[],
    public isolation?: 'worktree' | null,
    public sandbox_mode?: 'read-only' | 'workspace-write' | 'danger-full-access',
    public reasoning_effort?: 'low' | 'medium' | 'high',
    public extra?: Record<string, unknown>,
  ) {}

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!this.name) results.push({ level: 'error', message: 'name is required' });
    if (!this.body) results.push({ level: 'warning', message: 'body is empty' });
    return results;
  }
}
