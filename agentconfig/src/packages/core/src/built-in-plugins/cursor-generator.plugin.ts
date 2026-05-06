import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, SkillDefinition, HookDefinition } from '../types';
import { filterForTarget, buildFrontmatter, HOOK_EVENT_MAPS } from './base';

export class CursorInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'cursor';
  readonly instructionType = 'instruction';

  validate(_items: InstructionFile[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: InstructionFile[]): void {
    const instructions = filterForTarget(items, this.agent);

    for (const inst of instructions) {
      let content: string;

      switch (inst.activation) {
        case 'always': {
          const fm = buildFrontmatter({ alwaysApply: true });
          content = `${fm}\n\n${inst.body}`;
          break;
        }
        case 'scoped': {
          const fm = buildFrontmatter({
            globs: (inst.globs ?? []).join(', '),
            alwaysApply: false,
          });
          content = `${fm}\n\n${inst.body}`;
          break;
        }
        case 'ai-decided': {
          const fm = buildFrontmatter({
            description: inst.description ?? '',
            alwaysApply: false,
          });
          content = `${fm}\n\n${inst.body}`;
          break;
        }
        case 'manual':
        default:
          content = inst.body;
          break;
      }

      const dest = path.join(projectRoot, '.cursor', 'rules', `${inst.slug}.mdc`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
    }
  }
}

export class CursorCommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'cursor';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const skillMd = `---\nname: ${cmd.slug}\ndisable-model-invocation: true\n---\n\n${cmd.body}`;
      const dest = path.join(projectRoot, '.cursor', 'skills', cmd.slug, 'SKILL.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, skillMd);
    }
  }
}

export class CursorSkillGenerator implements GeneratorPlugin<SkillDefinition> {
  readonly agent = 'cursor';
  readonly instructionType = 'skill';

  validate(_items: SkillDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: SkillDefinition[]): void {
    for (const skill of items) {
      for (const file of skill.files) {
        const dest = path.join(projectRoot, '.agents', 'skills', skill.name, file.relativePath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, file.content);
      }
    }
  }
}

export class CursorHookGenerator implements GeneratorPlugin<HookDefinition> {
  readonly agent = 'cursor';
  readonly instructionType = 'hook';

  validate(_items: HookDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: HookDefinition[]): void {
    const hooks = filterForTarget(items, this.agent);
    const hookMap = HOOK_EVENT_MAPS[this.agent] ?? HOOK_EVENT_MAPS['cursor']!;
    
    if (hooks.length > 0) {
      const hooksObj: Record<string, Array<Record<string, unknown>>> = {};

      for (const hook of hooks) {
        const eventName = hookMap[hook.event];
        if (!eventName) continue;

        if (!hooksObj[eventName]) hooksObj[eventName] = [];

        const entry: Record<string, unknown> = { command: hook.command };
        if (hook.matcher) entry.matcher = hook.matcher;
        if (hook.timeout !== undefined) entry.timeout = hook.timeout;
        if (hook.blocking !== undefined) entry.failClosed = hook.blocking;

        hooksObj[eventName].push(entry);
      }

      const dest = path.join(projectRoot, '.cursor', 'hooks.json');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, JSON.stringify({ version: 1, hooks: hooksObj }, null, 2));
    }
  }
}

export default [
  new CursorInstructionGenerator(),
  new CursorCommandGenerator(),
  new CursorSkillGenerator(),
  new CursorHookGenerator(),
];
