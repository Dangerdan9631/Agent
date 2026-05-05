import type { ValidationResult } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';

export type HookEventName =
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PreCompact'
  | 'UserPromptSubmit'
  | 'PermissionRequest';

export type HookType = 'command' | 'http' | 'prompt' | 'agent';

export class HookDefinition implements InstructionType {
  readonly typeId = 'hook';

  constructor(
    public name: string,
    public event: HookEventName,
    public type: HookType,
    public matcher?: string,
    public command?: string,
    public timeout?: number,
    public blocking?: boolean,
    public async?: boolean,
    public targets?: string[],
    public excludedTargets?: string[],
  ) {}

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!this.name) results.push({ level: 'error', message: 'name is required' });
    if (!this.event) results.push({ level: 'error', message: 'event is required' });
    if (!this.type) results.push({ level: 'error', message: 'type is required' });
    if (this.type === 'command' && !this.command) {
      results.push({ level: 'error', message: 'command is required for command hooks' });
    }
    return results;
  }
}
