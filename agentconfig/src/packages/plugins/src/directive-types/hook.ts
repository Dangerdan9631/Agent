import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type {
  AgentConfig,
  DirectiveTypePlugin,
  ValidationResult,
  WriteOptions,
} from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';
import { parseHooks } from '../directive-parsers/hook';

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

function writeFile(filePath: string, content: string, opts?: WriteOptions): void {
  if (opts?.overwrite === false && fs.existsSync(filePath)) return;
  if (opts?.dryRun) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export const hookDirectiveTypePlugin: DirectiveTypePlugin<HookDefinition> = {
  typeId: 'hook',
  displayName: 'Hooks',
  parse(configDir: string): HookDefinition[] {
    return parseHooks(configDir);
  },
  write(items: HookDefinition[], configDir: string, opts?: WriteOptions): void {
    if (items.length === 0) return;
    writeFile(path.join(configDir, 'hooks', 'hooks.yaml'), yaml.dump({ hooks: items }), opts);
  },
  validate(items: HookDefinition[], config: AgentConfig): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (config.targets.includes('codex') && items.length > 0) {
      if (process.platform === 'win32') {
        results.push({
          level: 'warning',
          message: 'Codex hooks are disabled on Windows. Hook files will be generated but will not execute.',
        });
      }

      results.push({
        level: 'info',
        message: 'Codex hooks require `codex_hooks = true` in ~/.codex/config.toml to be activated.',
      });
    }

    return results;
  },
};
