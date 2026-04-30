import type { AgentGenerator, FileOutput, GeneratorInput } from '../types/generator';
import type { AgentDefinition, HookDefinition } from '../types/ir';
import { filterForTarget, buildInTextCondition, HOOK_EVENT_MAPS, AgentHookEventMap } from './base';

function buildCodexToml(agent: AgentDefinition): string {
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const lines: string[] = [];
  lines.push(`name = "${escape(agent.name)}"`);
  if (agent.description) lines.push(`description = "${escape(agent.description)}"`);
  if (agent.model) lines.push(`model = "${escape(agent.model)}"`);
  if (agent.reasoning_effort) lines.push(`model_reasoning_effort = "${agent.reasoning_effort}"`);
  if (agent.sandbox_mode) lines.push(`sandbox_mode = "${agent.sandbox_mode}"`);

  if (agent.tools && agent.tools.length > 0) {
    const toolList = agent.tools.map((t) => `"${escape(t)}"`).join(', ');
    lines.push(`tools = [${toolList}]`);
  }

  if (agent.body) {
    lines.push('');
    lines.push(`developer_instructions = """`);
    lines.push(agent.body);
    lines.push(`"""`);
  }

  return lines.join('\n');
}

function buildCodexHooksObject(
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

    const entry: Record<string, unknown> = { hooks: [hookEntry] };
    if (hook.matcher) entry.matcher = hook.matcher;

    result[eventName].push(entry);
  }

  return result;
}

class CodexGeneratorImpl implements AgentGenerator {
  constructor(
    readonly target: string,
    readonly displayName: string,
  ) {}

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const hookMap = HOOK_EVENT_MAPS[target] ?? HOOK_EVENT_MAPS['codex']!;
    const instructions = filterForTarget(ir.instructions, target);

    // always + ai-decided → AGENTS.md (concatenated; ai-decided gets in-text condition)
    const always = instructions.filter((i) => i.activation === 'always');
    const aiDecided = instructions.filter((i) => i.activation === 'ai-decided');

    const agentsParts = [
      ...always.map((i) => i.body),
      ...aiDecided.map((i) =>
        i.description ? buildInTextCondition(i.description, i.body) : i.body,
      ),
    ];

    if (agentsParts.length > 0) {
      outputs.push({ path: 'AGENTS.md', content: agentsParts.join('\n\n') });
    }

    // scoped → skipped (Codex has no native glob-scoped rules)

    // manual → .codex/instructions/<slug>.md
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      outputs.push({
        path: `.codex/instructions/${inst.slug}.md`,
        content: inst.body,
      });
    }

    // commands → .agents/skills/<slug>/SKILL.md (explicit invocation only)
    for (const cmd of filterForTarget(ir.commands, target)) {
      const skillMd = `---\nname: ${cmd.slug}\ndisable-model-invocation: true\n---\n\n${cmd.body}`;
      outputs.push({ path: `.agents/skills/${cmd.slug}/SKILL.md`, content: skillMd });
    }

    // agents → .codex/agents/<name>.toml
    for (const agent of filterForTarget(ir.agents, target)) {
      outputs.push({
        path: `.codex/agents/${agent.name}.toml`,
        content: buildCodexToml(agent),
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

    // hooks → .codex/hooks.json
    const hooks = filterForTarget(ir.hooks, target);
    if (hooks.length > 0) {
      const hooksObj = buildCodexHooksObject(hooks, hookMap);
      outputs.push({
        path: '.codex/hooks.json',
        content: JSON.stringify({ hooks: hooksObj }, null, 2),
      });
    }

    return outputs;
  }
}

export const CodexGenerator = new CodexGeneratorImpl('codex', 'Codex');
