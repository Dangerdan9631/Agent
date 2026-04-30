import type { AgentGenerator, FileOutput, GeneratorInput } from '../types/generator';
import type { HookDefinition } from '../types/ir';
import { filterForTarget, buildFrontmatter, buildInTextCondition, HOOK_EVENT_MAPS, AgentHookEventMap } from './base';

/** Build the nested hooks object used by both Claude Code settings.json */
function buildNestedHooksObject(
  hooks: HookDefinition[],
  hookMap: AgentHookEventMap,
): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {};

  for (const hook of hooks) {
    const eventName = hookMap[hook.event];
    if (!eventName) continue;

    if (!result[eventName]) result[eventName] = [];

    const hookEntry: Record<string, unknown> = { type: hook.type };
    if (hook.command) hookEntry.command = hook.command;
    if (hook.timeout !== undefined) hookEntry.timeout = hook.timeout;
    if (hook.async !== undefined) hookEntry.async = hook.async;

    const entry: Record<string, unknown> = { hooks: [hookEntry] };
    if (hook.matcher) entry.matcher = hook.matcher;

    result[eventName].push(entry);
  }

  return result;
}

export const ClaudeCodeGenerator: AgentGenerator = {
  target: 'claude-code',
  displayName: 'Claude Code',

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const hookMap = HOOK_EVENT_MAPS['claude-code']!;
    const instructions = filterForTarget(ir.instructions, target);

    // always → .claude/CLAUDE.md (all always instructions concatenated)
    const always = instructions.filter((i) => i.activation === 'always');
    if (always.length > 0) {
      outputs.push({
        path: '.claude/CLAUDE.md',
        content: always.map((i) => i.body).join('\n\n'),
      });
    }

    // scoped → .claude/rules/<slug>.md with paths: frontmatter
    for (const inst of instructions.filter((i) => i.activation === 'scoped')) {
      const fm = buildFrontmatter({ paths: inst.globs ?? [] });
      outputs.push({
        path: `.claude/rules/${inst.slug}.md`,
        content: `${fm}\n\n${inst.body}`,
      });
    }

    // ai-decided → .claude/rules/<slug>.md (no paths) + in-text condition
    for (const inst of instructions.filter((i) => i.activation === 'ai-decided')) {
      const body = inst.description
        ? buildInTextCondition(inst.description, inst.body)
        : inst.body;
      outputs.push({ path: `.claude/rules/${inst.slug}.md`, content: body });
    }

    // manual → .claude/rules/<slug>.md with paths: [] (blocks auto-load)
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      const fm = buildFrontmatter({ paths: [] });
      outputs.push({
        path: `.claude/rules/${inst.slug}.md`,
        content: `${fm}\n\n${inst.body}`,
      });
    }

    // commands → .claude/agents/<slug>.md (invokable subagent)
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.claude/agents/${cmd.slug}.md`,
        content: `---\nname: ${cmd.slug}\n---\n\n${cmd.body}`,
      });
    }

    // agents → .claude/agents/<name>.md
    for (const agent of filterForTarget(ir.agents, target)) {
      const fmFields: Record<string, unknown> = { name: agent.name };
      if (agent.description) fmFields.description = agent.description;
      if (agent.model) fmFields.model = agent.model;
      if (agent.tools && agent.tools.length > 0) fmFields.tools = agent.tools;
      if (agent.isolation) fmFields.isolation = agent.isolation;

      const fm = buildFrontmatter(fmFields);
      outputs.push({
        path: `.claude/agents/${agent.name}.md`,
        content: `${fm}\n\n${agent.body}`,
      });
    }

    // skills → .agents/skills/<name>/ (passthrough; Claude Code can @-reference)
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content,
        });
      }
    }

    // hooks → .claude/settings.json
    const hooks = filterForTarget(ir.hooks, target);
    if (hooks.length > 0) {
      const hooksObj = buildNestedHooksObject(hooks, hookMap);
      outputs.push({
        path: '.claude/settings.json',
        content: JSON.stringify({ hooks: hooksObj }, null, 2),
      });
    }

    return outputs;
  },
};
