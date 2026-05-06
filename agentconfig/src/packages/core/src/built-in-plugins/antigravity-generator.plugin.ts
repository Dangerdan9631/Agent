import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, SkillDefinition } from '../types';
import { filterForTarget, buildFrontmatter } from './base';

export class AntigravityInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'antigravity';
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
          fmFields = { activation: 'always' };
          break;
        case 'scoped':
          fmFields = { activation: 'glob', glob: inst.globs?.[0] ?? '**/*' };
          break;
        case 'ai-decided':
          fmFields = { activation: 'model', description: inst.description ?? '' };
          break;
        case 'manual':
          fmFields = { activation: 'manual' };
          break;
      }

      const fm = buildFrontmatter(fmFields);
      const dest = path.join(projectRoot, '.agents', 'rules', `${inst.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${fm}\n\n${inst.body}`);
    }
  }
}

export class AntigravityCommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'antigravity';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.agents', 'workflows', `${cmd.slug}.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, cmd.body);
    }
  }
}

export default [
  new AntigravityInstructionGenerator(),
  new AntigravityCommandGenerator(),
];
