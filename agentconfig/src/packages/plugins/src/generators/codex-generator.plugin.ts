import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, AgentDefinition, SkillDefinition, HookDefinition } from '../directive-types';
import { filterForTarget, buildInTextCondition, HOOK_EVENT_MAPS, AgentHookEventMap } from './base';

export class CodexInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'codex';
  readonly instructionType = 'instruction';

  validate(_items: InstructionFile[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: InstructionFile[]): void {
    const instructions = filterForTarget(items, this.agent);

    // always + ai-decided -> AGENTS.md
    const always = instructions.filter((i) => i.activation === 'always');
    const aiDecided = instructions.filter((i) => i.activation === 'ai-decided');

    const agentsParts = [
      ...always.map((i) => i.body),
      ...aiDecided.map((i) =>
        i.description ? buildInTextCondition(i.description, i.body) : i.body,
      ),
    ];

    if (agentsParts.length > 0) {
      const dest = path.join(projectRoot, 'AGENTS.md');
      fs.writeFileSync(dest, agentsParts.join('\n\n'));
    }

    // manual -> .codex/instructions/<slug>.md
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      const dest = path.join(projectRoot, '.codex', 'instructions', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, inst.body);
    }
  }
}

export class CodexCommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'codex';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.agents', 'skills', cmd.slug, 'SKILL.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `---\nname: ${cmd.slug}\ndisable-model-invocation: true\n---\n\n${cmd.body}`);
    }
  }
}

function buildCodexToml(agent: AgentDefinition): string {
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const lines: string[] = [];
  lines.push(`name = "${escape(agent.name)}"`);
  if (agent.description) lines.push(`description = "${escape(agent.description)}"`);
  if (agent.model) lines.push(`model = "${escape(agent.model)}"`);
  if (agent.reasoning_effort) lines.push(`model_reasoning_effort = "${agent.reasoning_effort}"`);
  if (agent.sandbox_mode) lines.push(`sandbox_mode = "${agent.sandbox_mode}"`);

  if (agent.tools && agent.tools.length > 0) {
    const toolList = agent.tools.map((t) => `"${escape(t)}"`).join(', ');
    lines.push(`tools = [${toolList}]`);
  }

  if (agent.body) {
    lines.push('');
    lines.push(`developer_instructions = """`);
    lines.push(agent.body);
    lines.push(`"""`);
  }

  return lines.join('\n');
}

export class CodexAgentGenerator implements GeneratorPlugin<AgentDefinition> {
  readonly agent = 'codex';
  readonly instructionType = 'agent';

  validate(_items: AgentDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: AgentDefinition[]): void {
    for (const agent of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.codex', 'agents', `${agent.name}.toml`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buildCodexToml(agent));
    }
  }
}

function buildCodexHooksObject(
  hooks: HookDefinition[],
  hookMap: AgentHookEventMap,
): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {};

  for (const hook of hooks) {
    const eventName = hookMap[hook.event];
    if (!eventName) continue;

    if (!result[eventName]) result[eventName] = [];

    const hookEntry: Record<string, unknown> = { type: hook.type };
    if (hook.command) hookEntry.command = hook.command;
    if (hook.timeout !== undefined) hookEntry.timeout = hook.timeout;

    const entry: Record<string, unknown> = { hooks: [hookEntry] };
    if (hook.matcher) entry.matcher = hook.matcher;

    result[eventName].push(entry);
  }

  return result;
}

export class CodexHookGenerator implements GeneratorPlugin<HookDefinition> {
  readonly agent = 'codex';
  readonly instructionType = 'hook';

  validate(_items: HookDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: HookDefinition[]): void {
    const hooks = filterForTarget(items, this.agent);
    const hookMap = HOOK_EVENT_MAPS['codex']!;
    
    if (hooks.length > 0) {
      const hooksObj = buildCodexHooksObject(hooks, hookMap);
      const dest = path.join(projectRoot, '.codex', 'hooks.json');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, JSON.stringify({ hooks: hooksObj }, null, 2));
    }
  }
}

export default [
  new CodexInstructionGenerator(),
  new CodexCommandGenerator(),
  new CodexAgentGenerator(),
  new CodexHookGenerator(),
];
