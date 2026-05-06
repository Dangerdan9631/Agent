import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { InstructionFile, CommandDefinition, SkillDefinition } from '../types';
import { filterForTarget, buildFrontmatter, buildInTextCondition } from './base';

export class CopilotCLIInstructionGenerator implements GeneratorPlugin<InstructionFile> {
  readonly agent = 'copilot-cli';
  readonly instructionType = 'instruction';

  validate(_items: InstructionFile[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: InstructionFile[]): void {
    const instructions = filterForTarget(items, this.agent);

    // always -> concatenated into .github/CopilotCLI-instructions.md
    const always = instructions.filter((i) => i.activation === 'always');
    if (always.length > 0) {
      const dest = path.join(projectRoot, '.github', 'copilot-instructions.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, always.map((i) => i.body).join('\n\n'));
    }

    // scoped -> .github/instructions/<slug>.instructions.md
    for (const inst of instructions.filter((i) => i.activation === 'scoped')) {
      const applyTo = (inst.globs ?? ['**/*']).join(', ');
      const fm = buildFrontmatter({ applyTo });
      const dest = path.join(projectRoot, '.github', 'instructions', `${inst.slug}.instructions.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${fm}\n\n${inst.body}`);
    }

    // ai-decided -> .github/instructions/<slug>.instructions.md
    for (const inst of instructions.filter((i) => i.activation === 'ai-decided')) {
      const fm = buildFrontmatter({ applyTo: '**/*' });
      const body = inst.description ? buildInTextCondition(inst.description, inst.body) : inst.body;
      const dest = path.join(projectRoot, '.github', 'instructions', `${inst.slug}.instructions.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${fm}\n\n${body}`);
    }

    // manual -> .github/prompts/<slug>.prompt.md
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      const dest = path.join(projectRoot, '.github', 'prompts', `${inst.slug}.prompt.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, inst.body);
    }
  }
}

export class CopilotCLICommandGenerator implements GeneratorPlugin<CommandDefinition> {
  readonly agent = 'copilot-cli';
  readonly instructionType = 'command';

  validate(_items: CommandDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: CommandDefinition[]): void {
    for (const cmd of filterForTarget(items, this.agent)) {
      const dest = path.join(projectRoot, '.github', 'prompts', `${cmd.slug}.prompt.md`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, cmd.body);
    }
  }
}

export class CopilotCLISkillGenerator implements GeneratorPlugin<SkillDefinition> {
  readonly agent = 'copilot-cli';
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
  new CopilotCLIInstructionGenerator(),
  new CopilotCLICommandGenerator(),
  new CopilotCLISkillGenerator(),
];

