import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { findConfigDir, resolveConfigDir, loadConfig, saveConfig } from './config';
import { loadGlobalPlugins } from './global-config';
import { parseArtifacts } from './parsers/index';
import { validate } from './validator';
import { write, computeDiff } from './writer';
import { importArtifacts, detectAgents, writeAgentConfigDir } from './import-utils';
import { registry } from './registry';
import type { InstructionType, AgentConfig } from 'agentconfig-api';
import type { IR } from './types';
import type { DetectedAgent } from './import-utils';
import type { DiffEntry } from './writer';
import type {
  GenerateOptions,
  GenerateResult,
  ValidateOptions,
  ValidateResult,
  DiffOptions,
  DiffResult,
  InitializeOptions,
  InitializeResult,
  ImportOptions,
  ImportResult,
  TranslateOptions,
  TranslateResult,
  ListTargetsOptions,
  ListTargetsResult,
} from 'agentconfig-api';

// ── Internal helpers ──────────────────────────────────────────────────────────

function generateToTempDir(ir: InstructionType[], config: AgentConfig, tempDir: string, targetFilter?: string[]): void {
  const targets = targetFilter && targetFilter.length > 0 ? targetFilter : config.targets;
  for (const target of targets) {
    const plugins = registry.getGenerators(target);
    for (const plugin of plugins) {
      const items = ir.filter(i => i.typeId === plugin.instructionType);
      plugin.generate(tempDir, items, { registry });
    }
  }
}

// We still map InstructionType[] to IR for legacy compatibility in validation
function buildLegacyIR(irList: InstructionType[]): IR {
  const ir: IR = { instructions: [], agents: [], skills: [], commands: [], hooks: [], extensions: {} };
  for (const item of irList) {
    if (item.typeId === 'instruction') ir.instructions.push(item as any);
    else if (item.typeId === 'agent') ir.agents.push(item as any);
    else if (item.typeId === 'skill') ir.skills.push(item as any);
    else if (item.typeId === 'command') ir.commands.push(item as any);
    else if (item.typeId === 'hook') ir.hooks.push(item as any);
    else {
      if (!ir.extensions[item.typeId]) ir.extensions[item.typeId] = [];
      ir.extensions[item.typeId].push(item);
    }
  }
  return ir;
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function generateOnce(options: GenerateOptions): Promise<GenerateResult> {
  const configDir = resolveConfigDir(options.configPath);
  const overrides = options.projectRootOverride
    ? { options: { output_dir: options.projectRootOverride } }
    : undefined;
  const config = await loadConfig(configDir, overrides);
  await loadGlobalPlugins();

  const irList = await parseArtifacts(configDir, config);
  const ir = buildLegacyIR(irList);
  const validationErrors = validate(ir, config).filter((r) => r.level === 'error');
  const outputDir = path.resolve(path.dirname(configDir), config.options.output_dir);
  const targets = options.targets?.length ? options.targets : config.targets;

  if (validationErrors.length > 0) {
    for (const error of validationErrors) {
      options.onEvent?.({ type: 'validation-error', error });
    }
    throw new Error('Validation errors found. Fix them before generating.');
  }

  let fileCount = 0;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentconfig-gen-'));
  try {
    generateToTempDir(irList, config, tempDir, options.targets);
    fileCount = await write(tempDir, outputDir, { overwrite: true, dryRun: false });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  config.last_generated = new Date().toISOString();
  await saveConfig(configDir, config);
  
  return { configDir, outputDir, targets, validationErrors: [], fileCount };
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  const result = await generateOnce(options);
  options.onEvent?.({ type: 'generated', result });

  if (!options.watch) return;

  options.onEvent?.({ type: 'watching', configDir: result.configDir });
  const { default: chokidar } = await import('chokidar');
  const watcher = chokidar.watch(result.configDir, { ignoreInitial: true });
  let busy = false;
  const onChange = async (p: string) => {
    if (busy) return;
    busy = true;
    options.onEvent?.({ type: 'change', path: p });
    try {
      const nextResult = await generateOnce(options);
      options.onEvent?.({ type: 'generated', result: nextResult });
    } catch (error) {
      options.onEvent?.({ type: 'error', error });
    } finally {
      busy = false;
    }
  };
  watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
}

// ── Validate ──────────────────────────────────────────────────────────────────

export async function runValidate(options: ValidateOptions): Promise<ValidateResult> {
  const configDir = resolveConfigDir(options.configPath);
  const config = await loadConfig(configDir);
  const irList = await parseArtifacts(configDir, config);
  const ir = buildLegacyIR(irList);
  const results = validate(ir, config);
  return { results };
}

// ── Diff ──────────────────────────────────────────────────────────────────────

export async function runDiff(options: DiffOptions): Promise<DiffResult> {
  const configDir = resolveConfigDir(options.configPath);
  const overrides = options.projectRootOverride
    ? { options: { output_dir: options.projectRootOverride } }
    : undefined;
  const config = await loadConfig(configDir, overrides);
  await loadGlobalPlugins();

  const irList = await parseArtifacts(configDir, config);
  const outputDir = path.resolve(path.dirname(configDir), config.options.output_dir);
  
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentconfig-diff-'));
  let diff: DiffEntry[];
  try {
    generateToTempDir(irList, config, tempDir, options.targets);
    diff = await computeDiff(tempDir, outputDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return { diff, outputDir };
}

// ── Initialize ────────────────────────────────────────────────────────────────

export async function runInitialize(options: InitializeOptions): Promise<InitializeResult> {
  const { target } = options;
  const sourceDir = path.resolve(options.projectRoot);
  const configDir = options.configPath
    ? path.resolve(options.configPath)
    : path.join(sourceDir, '.agentconfig');

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }
  if (!fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Source path is not a directory: ${sourceDir}`);
  }

  await loadGlobalPlugins();
  const detectedAgents: DetectedAgent[] = detectAgents(sourceDir);
  if (detectedAgents.length === 0) {
    return { sourceDir, configDir, detectedAgents: [], instructionCount: 0, agentCount: 0 };
  }
  if (fs.existsSync(configDir)) {
    throw new Error(`.agentconfig/ already exists at ${configDir}.`);
  }

  const ir = await importArtifacts(sourceDir, { target: target?.length ? target : undefined });
  const config: AgentConfig = {
    version: 1,
    targets: detectedAgents.map((a) => a.name),
    options: { output_dir: '.' },
  };
  await writeAgentConfigDir(ir, config, configDir);

  return {
    sourceDir,
    configDir,
    detectedAgents,
    instructionCount: ir.instructions.length,
    agentCount: ir.agents.length,
  };
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function runImport(options: ImportOptions): Promise<ImportResult> {
  const { sourceDir } = options;
  const destRoot = options.configPath
    ? path.dirname(path.resolve(options.configPath))
    : process.cwd();

  await loadGlobalPlugins();
  const sourceConfigDir = resolveConfigDir(sourceDir);
  const sourceConfig = await loadConfig(sourceConfigDir);
  const sourceIrList = await parseArtifacts(sourceConfigDir, sourceConfig);
  const sourceIr = buildLegacyIR(sourceIrList);

  const requestedDestConfigDir = options.configPath
    ? path.resolve(options.configPath)
    : undefined;
  const existingDestConfigDir = requestedDestConfigDir
    ? fs.existsSync(requestedDestConfigDir) ? requestedDestConfigDir : undefined
    : findConfigDir(destRoot);
  const destConfigDir =
    requestedDestConfigDir ?? existingDestConfigDir ?? path.join(destRoot, '.agentconfig');

  let mergedTargets = sourceConfig.targets;
  if (existingDestConfigDir) {
    const destConfig = await loadConfig(existingDestConfigDir).catch(() => null);
    if (destConfig) {
      mergedTargets = Array.from(new Set([...destConfig.targets, ...sourceConfig.targets]));
    }
  }

  const mergedConfig: AgentConfig = {
    version: 1,
    targets: mergedTargets,
    options: { output_dir: '.' },
  };
  await writeAgentConfigDir(sourceIr, mergedConfig, destConfigDir, {
    overwrite: false,
    dryRun: false,
  });

  return {
    sourceConfigDir,
    destConfigDir,
    instructionCount: sourceIr.instructions.length,
    agentCount: sourceIr.agents.length,
  };
}

// ── Translate ─────────────────────────────────────────────────────────────────

export async function runTranslate(options: TranslateOptions): Promise<TranslateResult> {
  const projectRoot = path.resolve(options.projectRoot ?? '.');

  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Project root not found: ${projectRoot}`);
  }
  if (!fs.statSync(projectRoot).isDirectory()) {
    throw new Error(`Project root is not a directory: ${projectRoot}`);
  }

  await loadGlobalPlugins();

  const importers = registry.getImporters(options.sourceTarget);
  if (importers.length === 0) {
    throw new Error(`Unknown source target: ${options.sourceTarget}`);
  }
  const generators = registry.getGenerators(options.destTarget);
  if (generators.length === 0) {
    throw new Error(`Unknown destination target: ${options.destTarget}`);
  }

  const ir = await importArtifacts(projectRoot, { target: [options.sourceTarget] });
  const config: AgentConfig = {
    version: 1,
    targets: [options.destTarget],
    options: { output_dir: '.' },
  };
  
  const irList: InstructionType[] = [
    ...ir.instructions,
    ...ir.agents,
    ...ir.skills,
    ...ir.commands,
    ...ir.hooks,
  ];

  let fileCount = 0;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentconfig-trans-'));
  try {
    generateToTempDir(irList, config, tempDir, [options.destTarget]);
    fileCount = await write(tempDir, projectRoot, { overwrite: true, dryRun: false });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    projectRoot,
    sourceTarget: options.sourceTarget,
    destTarget: options.destTarget,
    instructionCount: ir.instructions.length,
    agentCount: ir.agents.length,
    fileCount,
  };
}

// ── List Targets ──────────────────────────────────────────────────────────────

export async function listTargets(_options?: ListTargetsOptions): Promise<ListTargetsResult> {
  await loadGlobalPlugins();
  const generators = registry.listGenerators();
  const targets = new Set<string>();
  for (const g of generators) {
    if (Array.isArray(g.agent)) {
      for (const a of g.agent) targets.add(a);
    } else {
      targets.add(g.agent);
    }
  }
  return { targets: Array.from(targets) as any[] };
}
