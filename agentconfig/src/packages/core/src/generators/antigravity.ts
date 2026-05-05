import type { AgentGenerator, FileOutput, GeneratorInput } from 'agentconfig-api';
import { filterForTarget, buildFrontmatter } from './base';

export const AntigravityGenerator: AgentGenerator = {
  target: 'antigravity',
  displayName: 'Google Antigravity',

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const instructions = filterForTarget(ir.instructions, target);

    // All activation types → .agents/rules/<slug>.md with activation: frontmatter
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
      outputs.push({
        path: `.agents/rules/${inst.slug}.md`,
        content: `${fm}\n\n${inst.body}`,
      });
    }

    // commands → .agents/workflows/<slug>.md
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.agents/workflows/${cmd.slug}.md`,
        content: cmd.body,
      });
    }

    // skills → .agents/skills/<name>/ (primary agentskills.io path)
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content,
        });
      }
    }

    // hooks: not supported for Antigravity
    return outputs;
  },
};
