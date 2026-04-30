import type { AgentGenerator, FileOutput, GeneratorInput } from '../types/generator';
import { filterForTarget, buildFrontmatter } from './base';

export const WindsurfCLIGenerator: AgentGenerator = {
  target: 'windsurf-cli',
  displayName: 'Windsurf CLI',

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const instructions = filterForTarget(ir.instructions, target);

    // All activation types → .windsurf/rules/<slug>.md with trigger: frontmatter
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
      outputs.push({
        path: `.windsurf/rules/${inst.slug}.md`,
        content: `${fm}\n\n${inst.body}`,
      });
    }

    // commands → .windsurf/workflows/<slug>.md (/<slug> slash command)
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.windsurf/workflows/${cmd.slug}.md`,
        content: cmd.body,
      });
    }

    // skills → .agents/skills/<name>/ (Windsurf scans this path natively)
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content,
        });
      }
    }

    // hooks: not supported for Windsurf
    return outputs;
  }
};
