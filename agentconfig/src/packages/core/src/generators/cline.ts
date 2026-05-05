import type { AgentGenerator, FileOutput, GeneratorInput } from 'agentconfig-api';
import { filterForTarget, buildFrontmatter, buildInTextCondition, HOOK_EVENT_MAPS } from './base';

export const ClineGenerator: AgentGenerator = {
  target: 'cline',
  displayName: 'Cline',

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const hookMap = HOOK_EVENT_MAPS['cline']!;
    const instructions = filterForTarget(ir.instructions, target);

    // All activation types → .clinerules/<slug>.md
    for (const inst of instructions) {
      let content: string;

      switch (inst.activation) {
        case 'always':
          // No frontmatter → always active
          content = inst.body;
          break;
        case 'scoped':
          content = `${buildFrontmatter({ paths: inst.globs ?? [] })}\n\n${inst.body}`;
          break;
        case 'ai-decided':
          // No native support — use in-text condition prefix
          content = inst.description
            ? buildInTextCondition(inst.description, inst.body)
            : inst.body;
          break;
        case 'manual':
          // User disables via the Cline Rules panel toggle
          content = inst.body;
          break;
      }

      outputs.push({ path: `.clinerules/${inst.slug}.md`, content });
    }

    // commands → .clinerules/workflows/<slug>.md (/<slug> slash command)
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.clinerules/workflows/${cmd.slug}.md`,
        content: cmd.body,
      });
    }

    // skills → .cline/skills/<name>/
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.cline/skills/${skill.name}/${file.relativePath}`,
          content: file.content,
        });
      }
    }

    // hooks → .clinerules/hooks/<EventName> (bash) + .clinerules/hooks/<EventName>.ps1 (PowerShell)
    for (const hook of filterForTarget(ir.hooks, target)) {
      const clineEvent = hookMap[hook.event];
      if (!clineEvent) continue;

      const cmd = hook.command ?? 'true';

      // Bash wrapper (macOS/Linux — extensionless, must be chmod +x by user)
      const bashContent = [
        '#!/usr/bin/env bash',
        `# agentconfig-generated hook: ${hook.name} (${hook.event} → ${clineEvent})`,
        `exec ${cmd}`,
      ].join('\n');

      // PowerShell wrapper (Windows)
      const psContent = [
        '#!/usr/bin/env pwsh',
        `# agentconfig-generated hook: ${hook.name} (${hook.event} → ${clineEvent})`,
        `& ${cmd}`,
      ].join('\n');

      outputs.push({ path: `.clinerules/hooks/${clineEvent}`, content: bashContent });
      outputs.push({ path: `.clinerules/hooks/${clineEvent}.ps1`, content: psContent });
    }

    return outputs;
  },
};
