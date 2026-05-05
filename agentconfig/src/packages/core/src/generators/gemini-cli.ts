import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, SkillDefinition, HookDefinition } from '../types';
import { filterForTarget, buildInTextCondition, HOOK_EVENT_MAPS, AgentHookEventMap } from './base';

export class GeminiCliInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'gemini-cli';
  readonly instructionType = 'instruction';

  validate(_items: InstructionFile[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: InstructionFile[]): void {
    const instructions = filterForTarget(items, this.agent);

    // always + ai-decided -> GEMINI.md
    const always = instructions.filter((i) => i.activation === 'always');
    const aiDecided = instructions.filter((i) => i.activation === 'ai-decided');

    const geminiParts = [
      ...always.map((i) => i.body),
      ...aiDecided.map((i) =>
        i.description ? buildInTextCondition(i.description, i.body) : i.body,
      ),
    ];

    if (geminiParts.length > 0) {
      const dest = path.join(projectRoot, 'GEMINI.md');
      fs.writeFileSync(dest, geminiParts.join('\n\n'));
    }

    // manual -> .gemini/instructions/<slug>.md
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      const dest = path.join(projectRoot, '.gemini', 'instructions', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, inst.body);
    }
  }
}

export class GeminiCliCommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'gemini-cli';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.gemini', 'skills', cmd.slug, 'SKILL.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `---\nname: ${cmd.slug}\ndisable-model-invocation: true\n---\n\n${cmd.body}`);
    }
  }
}

export class GeminiCliSkillGenerator implements GeneratorPlugin<SkillDefinition> {
  readonly agent = 'gemini-cli';
  readonly instructionType = 'skill';

  validate(_items: SkillDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: SkillDefinition[]): void {
    for (const skill of items) {
      for (const file of skill.files) {
        const dest = path.join(projectRoot, '.gemini', 'skills', skill.name, file.relativePath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, file.content);
      }
    }
  }
}

function buildGeminiHooksObject(
  hooks: HookDefinition[],
  hookMap: AgentHookEventMap,
): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {};

  for (const hook of hooks) {
    const eventName = hookMap[hook.event];
    if (!eventName) continue;

    if (!result[eventName]) result[eventName] = [];

    const hookEntry: Record<string, unknown> = {
      type: hook.type,
      command: hook.command,
    };
    if (hook.timeout !== undefined) hookEntry.timeout = hook.timeout * 1000;
    if (hook.matcher) hookEntry.matcher = hook.matcher;

    result[eventName].push({ hooks: [hookEntry] });
  }

  return result;
}

export class GeminiCliHookGenerator implements GeneratorPlugin<HookDefinition> {
  readonly agent = 'gemini-cli';
  readonly instructionType = 'hook';

  validate(_items: HookDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: HookDefinition[]): void {
    const hooks = filterForTarget(items, this.agent);
    const hookMap = HOOK_EVENT_MAPS['gemini-cli']!;
    
    if (hooks.length > 0) {
      const hooksObj = buildGeminiHooksObject(hooks, hookMap);
      const dest = path.join(projectRoot, '.gemini', 'settings.json');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, JSON.stringify({ hooks: hooksObj }, null, 2));
    }
  }
}

export default [
  new GeminiCliInstructionGenerator(),
  new GeminiCliCommandGenerator(),
  new GeminiCliSkillGenerator(),
  new GeminiCliHookGenerator(),
];
