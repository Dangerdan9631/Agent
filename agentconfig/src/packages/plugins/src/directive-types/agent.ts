import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { DirectiveTypePlugin, ValidationResult, WriteOptions } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';
import { parseAgents } from '../directive-parsers/agent';

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

function writeFile(filePath: string, content: string, opts?: WriteOptions): void {
  if (opts?.overwrite === false && fs.existsSync(filePath)) return;
  if (opts?.dryRun) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export const agentDirectiveTypePlugin: DirectiveTypePlugin<AgentDefinition> = {
  typeId: 'agent',
  displayName: 'Agents',
  parse(configDir: string): Promise<AgentDefinition[]> {
    return parseAgents(configDir);
  },
  write(items: AgentDefinition[], configDir: string, opts?: WriteOptions): void {
    for (const agent of items) {
      const fields: Record<string, unknown> = { name: agent.name };
      if (agent.description) fields.description = agent.description;
      if (agent.model) fields.model = agent.model;
      if (agent.tools?.length) fields.tools = agent.tools;
      if (agent.targets?.length) fields.targets = agent.targets;
      if (agent.excludedTargets?.length) fields.excludedTargets = agent.excludedTargets;
      if (agent.isolation) fields.isolation = agent.isolation;
      if (agent.sandbox_mode) fields.sandbox_mode = agent.sandbox_mode;
      if (agent.reasoning_effort) fields.reasoning_effort = agent.reasoning_effort;
      if (agent.extra) Object.assign(fields, agent.extra);

      writeFile(
        path.join(configDir, 'agents', `${agent.name}.md`),
        `---\n${yaml.dump(fields).trimEnd()}\n---\n\n${agent.body}\n`,
        opts,
      );
    }
  },
  validate(items: AgentDefinition[]): ValidationResult[] {
    void items;
    return [];
  },
};
