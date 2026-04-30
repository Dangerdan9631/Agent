import type { AgentGenerator, FileOutput, GeneratorInput } from '../types/generator';
import { filterForTarget, buildFrontmatter, HOOK_EVENT_MAPS } from './base';

class CursorGeneratorImpl implements AgentGenerator {
  constructor(
    readonly target: string,
    readonly displayName: string,
  ) {}

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const hookMap = HOOK_EVENT_MAPS[target] ?? HOOK_EVENT_MAPS['cursor']!;
    const instructions = filterForTarget(ir.instructions, target);

    // All activation types → .cursor/rules/<slug>.mdc with appropriate frontmatter
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
          // No frontmatter = manual @-mention only
          content = inst.body;
          break;
      }

      outputs.push({ path: `.cursor/rules/${inst.slug}.mdc`, content });
    }

    // commands → .cursor/skills/<slug>/ with disable-model-invocation: true
    for (const cmd of filterForTarget(ir.commands, target)) {
      const skillMd = `---\nname: ${cmd.slug}\ndisable-model-invocation: true\n---\n\n${cmd.body}`;
      outputs.push({ path: `.cursor/skills/${cmd.slug}/SKILL.md`, content: skillMd });
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

    // hooks → .cursor/hooks.json
    const hooks = filterForTarget(ir.hooks, target);
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

      outputs.push({
        path: '.cursor/hooks.json',
        content: JSON.stringify({ version: 1, hooks: hooksObj }, null, 2),
      });
    }

    return outputs;
  }
}

export const CursorGenerator = new CursorGeneratorImpl('cursor', 'Cursor');