import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, AgentDefinition, SkillDefinition, HookDefinition } from '../types';
import { filterForTarget, buildFrontmatter, buildInTextCondition, HOOK_EVENT_MAPS, AgentHookEventMap } from './base';

export class ClaudeCodeInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'claude-code';
  readonly instructionType = 'instruction';

  validate(_items: InstructionFile[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: InstructionFile[]): void {
    const instructions = filterForTarget(items, this.agent);

    // always -> .claude/CLAUDE.md
    const always = instructions.filter((i) => i.activation === 'always');
    if (always.length > 0) {
      const dest = path.join(projectRoot, '.claude', 'CLAUDE.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, always.map((i) => i.body).join('\n\n'));
    }

    // scoped -> .claude/rules/<slug>.md with paths: frontmatter
    for (const inst of instructions.filter((i) => i.activation === 'scoped')) {
      const fm = buildFrontmatter({ paths: inst.globs ?? [] });
      const dest = path.join(projectRoot, '.claude', 'rules', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${fm}\n\n${inst.body}`);
    }

    // ai-decided -> .claude/rules/<slug>.md (no paths) + in-text condition
    for (const inst of instructions.filter((i) => i.activation === 'ai-decided')) {
      const body = inst.description ? buildInTextCondition(inst.description, inst.body) : inst.body;
      const dest = path.join(projectRoot, '.claude', 'rules', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, body);
    }

    // manual -> .claude/rules/<slug>.md with paths: []
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      const fm = buildFrontmatter({ paths: [] });
      const dest = path.join(projectRoot, '.claude', 'rules', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${fm}\n\n${inst.body}`);
    }
  }
}

export class ClaudeCodeCommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'claude-code';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.claude', 'agents', `${cmd.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `---\nname: ${cmd.slug}\n---\n\n${cmd.body}`);
    }
  }
}

export class ClaudeCodeAgentGenerator implements GeneratorPlugin<AgentDefinition> {
  readonly agent = 'claude-code';
  readonly instructionType = 'agent';

  validate(_items: AgentDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: AgentDefinition[]): void {
    for (const agent of filterForTarget(items, this.agent)) {
      const fmFields: Record<string, unknown> = { name: agent.name };
      if (agent.description) fmFields.description = agent.description;
      if (agent.model) fmFields.model = agent.model;
      if (agent.tools && agent.tools.length > 0) fmFields.tools = agent.tools;
      if (agent.isolation) fmFields.isolation = agent.isolation;

      const fm = buildFrontmatter(fmFields);
      const dest = path.join(projectRoot, '.claude', 'agents', `${agent.name}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${fm}\n\n${agent.body}`);
    }
  }
}

function buildNestedHooksObject(
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
    if (hook.async !== undefined) hookEntry.async = hook.async;

    const entry: Record<string, unknown> = { hooks: [hookEntry] };
    if (hook.matcher) entry.matcher = hook.matcher;

    result[eventName].push(entry);
  }

  return result;
}

export class ClaudeCodeHookGenerator implements GeneratorPlugin<HookDefinition> {
  readonly agent = 'claude-code';
  readonly instructionType = 'hook';

  validate(_items: HookDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: HookDefinition[]): void {
    const hooks = filterForTarget(items, this.agent);
    const hookMap = HOOK_EVENT_MAPS['claude-code']!;
    
    if (hooks.length > 0) {
      const hooksObj = buildNestedHooksObject(hooks, hookMap);
      const dest = path.join(projectRoot, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, JSON.stringify({ hooks: hooksObj }, null, 2));
    }
  }
}

export default [
  new ClaudeCodeInstructionGenerator(),
  new ClaudeCodeCommandGenerator(),
  new ClaudeCodeAgentGenerator(),
  new ClaudeCodeHookGenerator(),
];
