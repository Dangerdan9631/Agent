import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { IR, InstructionFile, AgentDefinition } from '../types/ir';
import type { AgentConfig } from '../types/config';
import type { DetectedAgent } from '../types/generator';
import { registry } from '../registry';

import { importCopilot, detectCopilot } from './copilot';
import { importCopilotCli, detectCopilotCli } from './copilot-cli';
import { importCursor, detectCursor } from './cursor';
import { importClaudeCode, detectClaudeCode } from './claude-code';
import { importGeminiCli, detectGeminiCli } from './gemini-cli';
import { importAntigravity, detectAntigravity } from './antigravity';
import { importCodex, detectCodex } from './codex';
import { importWindsurf, detectWindsurf } from './windsurf';
import { importWindsurfCli, detectWindsurfCli } from './windsurf-cli';
import { importCline, detectCline } from './cline';

// ─── Register built-in importers and detectors ────────────────────────────────
// (mirrors the side-effect pattern used by generators/index.ts)

registry.registerImporter('copilot', importCopilot);
registry.registerImporter('copilot-cli', importCopilotCli);
registry.registerDetector(detectCopilot);
registry.registerDetector(detectCopilotCli);

registry.registerImporter('cursor', importCursor);
registry.registerDetector(detectCursor);

registry.registerImporter('claude-code', importClaudeCode);
registry.registerDetector(detectClaudeCode);

registry.registerImporter('gemini-cli', importGeminiCli);
registry.registerDetector(detectGeminiCli);

registry.registerImporter('antigravity', importAntigravity);
registry.registerDetector(detectAntigravity);

registry.registerImporter('codex', importCodex);
registry.registerDetector(detectCodex);

registry.registerImporter('windsurf', importWindsurf);
registry.registerDetector(detectWindsurf);

registry.registerImporter('windsurf-cli', importWindsurfCli);
registry.registerDetector(detectWindsurfCli);

registry.registerImporter('cline', importCline);
registry.registerDetector(detectCline);

// ─── Re-export DetectedAgent so callers can import from one place ─────────────
export type { DetectedAgent } from '../types/generator';

// ─── Agent detection ──────────────────────────────────────────────────────────

/** Probe a project directory for agent-native files and return detected agents. */
export function detectAgents(dir: string): DetectedAgent[] {
  return registry.listDetectors().flatMap((fn) => fn(dir));
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function normalizeBody(body: string): string {
  return body
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Merge imported instructions by content — exact match first, then normalized whitespace. */
function deduplicateInstructions(instructions: InstructionFile[]): InstructionFile[] {
  const exactMap = new Map<string, InstructionFile>();
  const normalMap = new Map<string, InstructionFile>();
  const result: InstructionFile[] = [];

  for (const inst of instructions) {
    const exact = inst.body;
    const normalized = normalizeBody(inst.body);

    if (exactMap.has(exact)) continue;
    if (normalMap.has(normalized)) continue;

    exactMap.set(exact, inst);
    normalMap.set(normalized, inst);
    result.push(inst);
  }

  return result;
}

// ─── Import orchestrator ──────────────────────────────────────────────────────

export interface ImportOptions {
  /** Only import from these specific agents (default: all detected) */
  target?: string[];
}


/**
 * Scan a project directory for agent-native files, reverse-parse them to IR,
 * deduplicate instructions by content similarity, and return a normalized IR.
 */
export async function importArtifacts(
  sourceDir: string,
  opts?: ImportOptions,
): Promise<IR> {
  const detected = detectAgents(sourceDir);
  const targetAgents =
    opts?.target && opts.target.length > 0
      ? opts.target
      : detected.map((a) => a.name);

  const allInstructions: InstructionFile[] = [];
  const allAgents: AgentDefinition[] = [];

  for (const agentName of targetAgents) {
    const importer = registry.getImporter(agentName);
    if (!importer) continue;

    const result = await importer(sourceDir);
    allInstructions.push(...result.instructions);
    if (result.agents) allAgents.push(...result.agents);
  }

  return {
    instructions: deduplicateInstructions(allInstructions),
    agents: allAgents,
    skills: [],
    commands: [],
    hooks: [],
    extensions: {},
  };
}

// ─── Write .agentconfig/ from IR ─────────────────────────────────────────────

/**
 * Write a normalized IR back to a `.agentconfig/` directory structure.
 * Used by the `import` CLI command.
 */
export async function writeAgentConfigDir(
  ir: IR,
  config: AgentConfig,
  configDir: string,
  opts?: { overwrite?: boolean; dryRun?: boolean },
): Promise<void> {
  if (!opts?.dryRun) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // config.yaml
  const configYaml = yaml.dump({
    version: 1,
    targets: config.targets,
    options: config.options,
  });
  writeFile(path.join(configDir, 'config.yaml'), configYaml, opts);

  // instructions/
  for (const inst of ir.instructions) {
    const fm: Record<string, unknown> = { activation: inst.activation };
    if (inst.globs && inst.globs.length > 0) fm.globs = inst.globs;
    if (inst.description) fm.description = inst.description;
    if (inst.slug !== inst.name) fm.name = inst.slug;
    if (inst.targets && inst.targets.length > 0) fm.targets = inst.targets;
    if (inst.excludedTargets && inst.excludedTargets.length > 0)
      fm.excludedTargets = inst.excludedTargets;

    let fmStr = '---\n' + yaml.dump(fm).trimEnd() + '\n---';
    if (inst.importNote) {
      fmStr = `${inst.importNote}\n${fmStr}`;
    }

    const content = `${fmStr}\n\n${inst.body}\n`;
    writeFile(path.join(configDir, 'instructions', `${inst.name}.md`), content, opts);
  }

  // agents/
  for (const agent of ir.agents) {
    const fm: Record<string, unknown> = { name: agent.name };
    if (agent.description) fm.description = agent.description;
    if (agent.model) fm.model = agent.model;
    if (agent.tools && agent.tools.length > 0) fm.tools = agent.tools;
    if (agent.targets && agent.targets.length > 0) fm.targets = agent.targets;
    if (agent.isolation) fm.isolation = agent.isolation;
    if (agent.sandbox_mode) fm.sandbox_mode = agent.sandbox_mode;
    if (agent.reasoning_effort) fm.reasoning_effort = agent.reasoning_effort;

    const fmStr = '---\n' + yaml.dump(fm).trimEnd() + '\n---';
    const content = `${fmStr}\n\n${agent.body}\n`;
    writeFile(path.join(configDir, 'agents', `${agent.name}.md`), content, opts);
  }

  // skills/ (copy files)
  for (const skill of ir.skills) {
    for (const file of skill.files) {
      writeFile(
        path.join(configDir, 'skills', skill.name, file.relativePath),
        file.content,
        opts,
      );
    }
  }

  // commands/
  for (const cmd of ir.commands) {
    writeFile(path.join(configDir, 'commands', `${cmd.name}.md`), cmd.body + '\n', opts);
  }

  // hooks/hooks.yaml
  if (ir.hooks.length > 0) {
    const hooksData = { hooks: ir.hooks };
    const hooksYaml = yaml.dump(hooksData);
    writeFile(path.join(configDir, 'hooks', 'hooks.yaml'), hooksYaml, opts);
  }

  // directive type extensions contributed by plugins
  for (const [typeId, items] of Object.entries(ir.extensions)) {
    const plugin = registry.getDirectiveType(typeId);
    if (plugin?.write) {
      plugin.write(items, configDir, opts);
    }
  }
}

function writeFile(
  filePath: string,
  content: string,
  opts?: { overwrite?: boolean; dryRun?: boolean },
): void {
  if (opts?.overwrite === false && fs.existsSync(filePath)) return;
  if (!opts?.dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
