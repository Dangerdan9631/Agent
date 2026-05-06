import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, SkillDefinition, HookDefinition } from '../types';
import { filterForTarget, buildFrontmatter, buildInTextCondition, HOOK_EVENT_MAPS } from './base';

export class ClineInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'cline';
  readonly instructionType = 'instruction';

  validate(_items: InstructionFile[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: InstructionFile[]): void {
    const instructions = filterForTarget(items, this.agent);

    for (const inst of instructions) {
      let content: string;

      switch (inst.activation) {
        case 'always':
          content = inst.body;
          break;
        case 'scoped':
          content = `${buildFrontmatter({ paths: inst.globs ?? [] })}\n\n${inst.body}`;
          break;
        case 'ai-decided':
          content = inst.description ? buildInTextCondition(inst.description, inst.body) : inst.body;
          break;
        case 'manual':
          content = inst.body;
          break;
      }

      const dest = path.join(projectRoot, '.clinerules', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
    }
  }
}

export class ClineCommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'cline';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.clinerules', 'workflows', `${cmd.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, cmd.body);
    }
  }
}

export class ClineSkillGenerator implements GeneratorPlugin<SkillDefinition> {
  readonly agent = 'cline';
  readonly instructionType = 'skill';

  validate(_items: SkillDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: SkillDefinition[]): void {
    for (const skill of items) {
      for (const file of skill.files) {
        const dest = path.join(projectRoot, '.cline', 'skills', skill.name, file.relativePath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, file.content);
      }
    }
  }
}

export class ClineHookGenerator implements GeneratorPlugin<HookDefinition> {
  readonly agent = 'cline';
  readonly instructionType = 'hook';

  validate(_items: HookDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: HookDefinition[]): void {
    const hooks = filterForTarget(items, this.agent);
    const hookMap = HOOK_EVENT_MAPS['cline']!;

    for (const hook of hooks) {
      const clineEvent = hookMap[hook.event];
      if (!clineEvent) continue;

      const cmd = hook.command ?? 'true';

      const bashContent = [
        '#!/usr/bin/env bash',
        `# agentconfig-generated hook: ${hook.name} (${hook.event} → ${clineEvent})`,
        `exec ${cmd}`,
      ].join('\n');

      const psContent = [
        '#!/usr/bin/env pwsh',
        `# agentconfig-generated hook: ${hook.name} (${hook.event} → ${clineEvent})`,
        `& ${cmd}`,
      ].join('\n');

      const bashDest = path.join(projectRoot, '.clinerules', 'hooks', clineEvent);
      fs.mkdirSync(path.dirname(bashDest), { recursive: true });
      fs.writeFileSync(bashDest, bashContent);

      const psDest = path.join(projectRoot, '.clinerules', 'hooks', `${clineEvent}.ps1`);
      fs.mkdirSync(path.dirname(psDest), { recursive: true });
      fs.writeFileSync(psDest, psContent);
    }
  }
}

export default [
  new ClineInstructionGenerator(),
  new ClineCommandGenerator(),
  new ClineSkillGenerator(),
  new ClineHookGenerator(),
];
