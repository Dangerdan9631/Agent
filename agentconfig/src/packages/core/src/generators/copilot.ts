import type { AgentGenerator, FileOutput, GeneratorInput } from 'agentconfig-api';
import { filterForTarget, buildFrontmatter, buildInTextCondition } from './base';

class CopilotGeneratorImpl implements AgentGenerator {
  readonly target = 'copilot';
  readonly displayName = 'GitHub Copilot';

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const instructions = filterForTarget(ir.instructions, target);

    // always → concatenated into .github/copilot-instructions.md
    const always = instructions.filter((i) => i.activation === 'always');
    if (always.length > 0) {
      outputs.push({
        path: '.github/copilot-instructions.md',
        content: always.map((i) => i.body).join('\n\n'),
      });
    }

    // scoped → .github/instructions/<slug>.instructions.md with applyTo:
    for (const inst of instructions.filter((i) => i.activation === 'scoped')) {
      const applyTo = (inst.globs ?? ['**/*']).join(', ');
      const fm = buildFrontmatter({ applyTo });
      outputs.push({
        path: `.github/instructions/${inst.slug}.instructions.md`,
        content: `${fm}\n\n${inst.body}`,
      });
    }

    // ai-decided → .github/instructions/<slug>.instructions.md, applyTo: **/* + in-text condition
    for (const inst of instructions.filter((i) => i.activation === 'ai-decided')) {
      const fm = buildFrontmatter({ applyTo: '**/*' });
      const body = inst.description
        ? buildInTextCondition(inst.description, inst.body)
        : inst.body;
      outputs.push({
        path: `.github/instructions/${inst.slug}.instructions.md`,
        content: `${fm}\n\n${body}`,
      });
    }

    // manual → .github/prompts/<slug>.prompt.md
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      outputs.push({
        path: `.github/prompts/${inst.slug}.prompt.md`,
        content: inst.body,
      });
    }

    // commands → .github/prompts/<slug>.prompt.md
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.github/prompts/${cmd.slug}.prompt.md`,
        content: cmd.body,
      });
    }

    // skills → .agents/skills/<name>/ (shared path)
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content,
        });
      }
    }

    // hooks: not supported for Copilot
    return outputs;
  }
}

export const CopilotGenerator = new CopilotGeneratorImpl();
