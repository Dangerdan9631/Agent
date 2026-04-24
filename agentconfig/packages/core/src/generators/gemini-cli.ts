import type { AgentGenerator, FileOutput, GeneratorInput } from '../types/generator';
import type { HookDefinition } from '../types/ir';
import { filterForTarget, buildInTextCondition, HOOK_EVENT_MAPS, AgentHookEventMap } from './base';

function buildGeminiHooksObject(
  hooks: HookDefinition[],
  hookMap: AgentHookEventMap,
): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {};

  for (const hook of hooks) {
    const eventName = hookMap[hook.event];
    if (!eventName) continue;

    if (!result[eventName]) result[eventName] = [];

    const hookEntry: Record<string, unknown> = {
      type: hook.type,
      command: hook.command,
    };
    if (hook.timeout !== undefined) hookEntry.timeout = hook.timeout * 1000; // Gemini uses ms
    if (hook.matcher) hookEntry.matcher = hook.matcher;

    result[eventName].push({ hooks: [hookEntry] });
  }

  return result;
}

export const GeminiCliGenerator: AgentGenerator = {
  target: 'gemini-cli',
  displayName: 'Gemini CLI',

  generate({ ir, target }: GeneratorInput): FileOutput[] {
    const outputs: FileOutput[] = [];
    const hookMap = HOOK_EVENT_MAPS['gemini-cli']!;
    const instructions = filterForTarget(ir.instructions, target);

    // always + ai-decided → GEMINI.md (concatenated; ai-decided gets in-text condition)
    const always = instructions.filter((i) => i.activation === 'always');
    const aiDecided = instructions.filter((i) => i.activation === 'ai-decided');

    const geminiParts = [
      ...always.map((i) => i.body),
      ...aiDecided.map((i) =>
        i.description ? buildInTextCondition(i.description, i.body) : i.body,
      ),
    ];

    if (geminiParts.length > 0) {
      outputs.push({ path: 'GEMINI.md', content: geminiParts.join('\n\n') });
    }

    // scoped → skipped (Gemini CLI has no native glob-scoped rules)

    // manual → .gemini/instructions/<slug>.md
    for (const inst of instructions.filter((i) => i.activation === 'manual')) {
      outputs.push({
        path: `.gemini/instructions/${inst.slug}.md`,
        content: inst.body,
      });
    }

    // commands → .gemini/skills/<slug>/SKILL.md
    for (const cmd of filterForTarget(ir.commands, target)) {
      const skillMd = `---\nname: ${cmd.slug}\ndisable-model-invocation: true\n---\n\n${cmd.body}`;
      outputs.push({ path: `.gemini/skills/${cmd.slug}/SKILL.md`, content: skillMd });
    }

    // skills → .gemini/skills/<name>/
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.gemini/skills/${skill.name}/${file.relativePath}`,
          content: file.content,
        });
      }
    }

    // hooks → .gemini/settings.json
    const hooks = filterForTarget(ir.hooks, target);
    if (hooks.length > 0) {
      const hooksObj = buildGeminiHooksObject(hooks, hookMap);
      outputs.push({
        path: '.gemini/settings.json',
        content: JSON.stringify({ hooks: hooksObj }, null, 2),
      });
    }

    return outputs;
  },
};
