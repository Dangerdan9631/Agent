import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { IR, InstructionFile, AgentDefinition } from '../types/ir';
import type { AgentConfig } from '../types/config';
import { importCopilot } from './copilot';
import { importCursor } from './cursor';
import { importClaudeCode } from './claude-code';
import { importGeminiCli } from './gemini-cli';
import { importAntigravity } from './antigravity';
import { importCodex } from './codex';
import { importWindsurf } from './windsurf';
import { importCline } from './cline';

// ─── Agent detection ──────────────────────────────────────────────────────────

export interface DetectedAgent {
  name: string;
  /** high = sentinel directory found; low = only root file detected */
  confidence: 'high' | 'low';
}

/** Probe a project directory for agent-native files and return detected agents. */
export function detectAgents(dir: string): DetectedAgent[] {
  const detected: DetectedAgent[] = [];
  const e = (p: string) => fs.existsSync(p);

  if (e(path.join(dir, '.github', 'copilot-instructions.md')) || e(path.join(dir, '.github', 'instructions'))) {
    detected.push({ name: 'copilot', confidence: 'high' });
  }
  if (e(path.join(dir, '.cursor', 'rules'))) {
    detected.push({ name: 'cursor', confidence: 'high' });
  }
  if (e(path.join(dir, '.claude'))) {
    detected.push({ name: 'claude-code', confidence: 'high' });
  } else if (e(path.join(dir, 'CLAUDE.md'))) {
    detected.push({ name: 'claude-code', confidence: 'low' });
  }
  if (e(path.join(dir, '.gemini')) || e(path.join(dir, 'GEMINI.md'))) {
    detected.push({ name: 'gemini-cli', confidence: 'high' });
  }
  if (e(path.join(dir, '.agents', 'rules'))) {
    detected.push({ name: 'antigravity', confidence: 'high' });
  }
  if (e(path.join(dir, '.codex'))) {
    detected.push({ name: 'codex', confidence: 'high' });
  } else if (e(path.join(dir, 'AGENTS.md'))) {
    // AGENTS.md is shared — lower confidence; only add if no other agent used it
    detected.push({ name: 'codex', confidence: 'low' });
  }
  if (e(path.join(dir, '.windsurf', 'rules'))) {
    detected.push({ name: 'windsurf', confidence: 'high' });
  }
  if (e(path.join(dir, '.clinerules'))) {
    detected.push({ name: 'cline', confidence: 'high' });
  }

  return detected;
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
  from?: string[];
  /** Merge into an existing .agentconfig/ rather than erroring */
  merge?: boolean;
  /** Overwrite the existing .agentconfig/ without prompting */
  overwrite?: boolean;
}

type AgentImporter = (dir: string) => Promise<{
  instructions: InstructionFile[];
  agents?: AgentDefinition[];
}>;

const IMPORTERS: Record<string, AgentImporter> = {
  copilot: importCopilot,
  cursor: importCursor,
  'claude-code': importClaudeCode,
  'gemini-cli': importGeminiCli,
  antigravity: importAntigravity,
  codex: importCodex,
  windsurf: importWindsurf,
  cline: importCline,
};

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
    opts?.from && opts.from.length > 0
      ? opts.from
      : detected.map((a) => a.name);

  const allInstructions: InstructionFile[] = [];
  const allAgents: AgentDefinition[] = [];

  for (const agentName of targetAgents) {
    const importer = IMPORTERS[agentName];
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
