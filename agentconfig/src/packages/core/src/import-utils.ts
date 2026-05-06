import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { loadGlobalPlugins } from './global-config';
import type { InstructionType, AgentConfig, DetectedAgent } from 'agentconfig-api';
import { registry } from './registry';
import type { IR } from './types';


import { InstructionFile, AgentDefinition, SkillDefinition, CommandDefinition, HookDefinition } from './types';

export type { DetectedAgent } from 'agentconfig-api';

export function detectAgents(dir: string): DetectedAgent[] {
  return registry.listDetectors().flatMap((fn) => fn(dir));
}

function normalizeBody(body: string): string {
  return body
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

export interface ImportOptions {
  target?: string[];
}

export async function importArtifacts(
  sourceDir: string,
  opts?: ImportOptions,
): Promise<IR> {
  await loadGlobalPlugins();
  const detected = detectAgents(sourceDir);
  const targetAgents =
    opts?.target && opts.target.length > 0
      ? opts.target
      : detected.map((a) => a.name);

  const allItems: InstructionType[] = [];

  for (const agentName of targetAgents) {
    const importers = registry.getImporters(agentName);
    for (const importer of importers) {
      const items = await importer.import(sourceDir, { registry });
      allItems.push(...items);
    }
  }

  // We are keeping the legacy IR structure returned by importArtifacts since
  // other operations currently depend on it. We'll extract arrays based on typeId.
  const instructions = allItems.filter(i => i.typeId === 'instruction') as any[];
  const agents = allItems.filter(i => i.typeId === 'agent') as any[];
  const skills = allItems.filter(i => i.typeId === 'skill') as any[];
  const commands = allItems.filter(i => i.typeId === 'command') as any[];
  const hooks = allItems.filter(i => i.typeId === 'hook') as any[];

  return {
    instructions: deduplicateInstructions(instructions),
    agents,
    skills,
    commands,
    hooks,
    extensions: {},
  };
}

export async function writeAgentConfigDir(
  ir: IR,
  config: AgentConfig,
  configDir: string,
  opts?: { overwrite?: boolean; dryRun?: boolean },
): Promise<void> {
  if (!opts?.dryRun) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configData: Record<string, unknown> = {
    version: 1,
    targets: config.targets,
    options: config.options,
  };
  if (config.last_generated) {
    configData.last_generated = config.last_generated;
  }
  const configYaml = yaml.dump(configData);
  writeFile(path.join(configDir, 'config.yaml'), configYaml, opts);

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

  for (const skill of ir.skills) {
    for (const file of skill.files) {
      writeFile(
        path.join(configDir, 'skills', skill.name, file.relativePath),
        file.content,
        opts,
      );
    }
  }

  for (const cmd of ir.commands) {
    writeFile(path.join(configDir, 'commands', `${cmd.name}.md`), cmd.body + '\n', opts);
  }

  if (ir.hooks.length > 0) {
    const hooksData = { hooks: ir.hooks };
    const hooksYaml = yaml.dump(hooksData);
    writeFile(path.join(configDir, 'hooks', 'hooks.yaml'), hooksYaml, opts);
  }

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
