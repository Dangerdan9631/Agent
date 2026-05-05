import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, SkillDefinition } from '../types';
import { filterForTarget, buildFrontmatter } from './base';

export class WindsurfInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'windsurf';
  readonly instructionType = 'instruction';

  validate(_items: InstructionFile[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: InstructionFile[]): void {
    const instructions = filterForTarget(items, this.agent);

    for (const inst of instructions) {
      let fmFields: Record<string, unknown>;

      switch (inst.activation) {
        case 'always':
          fmFields = { trigger: 'always_on' };
          break;
        case 'scoped':
          fmFields = { trigger: 'glob', globs: (inst.globs ?? []).join(', ') };
          break;
        case 'ai-decided':
          fmFields = { trigger: 'model_decision', description: inst.description ?? '' };
          break;
        case 'manual':
          fmFields = { trigger: 'manual' };
          break;
      }

      const fm = buildFrontmatter(fmFields);
      const dest = path.join(projectRoot, '.windsurf', 'rules', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${fm}\n\n${inst.body}`);
    }
  }
}

export class WindsurfCommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'windsurf';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.windsurf', 'workflows', `${cmd.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, cmd.body);
    }
  }
}

export class WindsurfSkillGenerator implements GeneratorPlugin<SkillDefinition> {
  readonly agent = 'windsurf';
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

export default [
  new WindsurfInstructionGenerator(),
  new WindsurfCommandGenerator(),
  new WindsurfSkillGenerator(),
];
