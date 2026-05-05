import * as path from 'node:path';
import * as fs from 'node:fs';
import { findConfigDir, resolveConfigDir, loadConfig } from './config';
import { loadGlobalPlugins } from './global-config';
import { parseArtifacts } from './parsers/index';
import { validate } from './validator';
import { write, computeDiff, deduplicateOutputs } from './writer';
import { importArtifacts, detectAgents, writeAgentConfigDir } from './importers/index';
import { registry } from './registry';
import type { IR } from './types/ir';
import type { AgentConfig } from './types/config';
import type { FileOutput, AgentGenerator } from './types/generator';
import type { DetectedAgent } from './importers/index';
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

function buildFiles(ir: IR, config: AgentConfig, targetFilter?: string[]): FileOutput[] {
  const targets = targetFilter && targetFilter.length > 0 ? targetFilter : config.targets;
  const outputs: FileOutput[] = [];
  for (const target of targets) {
    const gen = registry.get(target);
    if (!gen) continue;
    outputs.push(...gen.generate({ ir, config, target }));
  }
  return deduplicateOutputs(outputs);
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function generateOnce(options: GenerateOptions): Promise<GenerateResult> {
  const configDir = resolveConfigDir(options.configPath);
  const overrides = options.projectRootOverride
    ? { options: { output_dir: options.projectRootOverride } }
    : undefined;
  const config = await loadConfig(configDir, overrides);
  await loadGlobalPlugins();

  const ir = await parseArtifacts(configDir, config);
  const validationErrors = validate(ir, config).filter((r) => r.level === 'error');
  const outputDir = path.resolve(path.dirname(configDir), config.options.output_dir);
  const targets = options.targets?.length ? options.targets : config.targets;

  if (validationErrors.length > 0) {
    for (const error of validationErrors) {
      options.onEvent?.({ type: 'validation-error', error });
    }
    throw new Error('Validation errors found. Fix them before generating.');
  }

  const files = buildFiles(ir, config, options.targets);
  await write(files, { outputDir, overwrite: true, dryRun: false });
  return { configDir, outputDir, targets, validationErrors: [], fileCount: files.length };
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
  const ir = await parseArtifacts(configDir, config);
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

  const ir = await parseArtifacts(configDir, config);
  const files = buildFiles(ir, config, options.targets);
  const outputDir = path.resolve(path.dirname(configDir), config.options.output_dir);
  const diff: DiffEntry[] = computeDiff(files, outputDir);

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

  const sourceConfigDir = resolveConfigDir(sourceDir);
  const sourceConfig = await loadConfig(sourceConfigDir);
  const sourceIr = await parseArtifacts(sourceConfigDir, sourceConfig);

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

  if (!registry.getImporter(options.sourceTarget)) {
    throw new Error(`Unknown source target: ${options.sourceTarget}`);
  }
  if (!registry.get(options.destTarget)) {
    throw new Error(`Unknown destination target: ${options.destTarget}`);
  }

  const ir = await importArtifacts(projectRoot, { target: [options.sourceTarget] });
  const config: AgentConfig = {
    version: 1,
    targets: [options.destTarget],
    options: { output_dir: '.' },
  };
  const files = buildFiles(ir, config, [options.destTarget]);
  await write(files, { outputDir: projectRoot, overwrite: true, dryRun: false });

  return {
    projectRoot,
    sourceTarget: options.sourceTarget,
    destTarget: options.destTarget,
    instructionCount: ir.instructions.length,
    agentCount: ir.agents.length,
    fileCount: files.length,
  };
}

// ── List Targets ──────────────────────────────────────────────────────────────

export async function listTargets(_options?: ListTargetsOptions): Promise<ListTargetsResult> {
  await loadGlobalPlugins();
  const targets: AgentGenerator[] = registry.list();
  return { targets };
}
