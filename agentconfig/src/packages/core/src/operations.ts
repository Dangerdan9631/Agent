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
import type { ValidationResult } from './validator';
import type { DiffEntry } from './writer';
import type { DetectedAgent } from './importers/index';

// ── Internal helpers (avoids importing from index.ts to prevent circular deps) ─

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

export interface GenerateOptions {
  configPath?: string;
  projectRootOverride?: string;
  targets?: string[];
  watch?: boolean;
  onEvent?: (event: GenerateEvent) => void;
}

export interface GenerateResult {
  configDir: string;
  outputDir: string;
  /** Effective target list (from options or config) */
  targets: string[];
  /** Non-empty when config validation failed; no files were written */
  validationErrors: ValidationResult[];
  /** Number of files written */
  fileCount: number;
}

export type GenerateEvent =
  | { type: 'generated'; result: GenerateResult }
  | { type: 'validation-error'; error: ValidationResult }
  | { type: 'watching'; configDir: string }
  | { type: 'change'; path: string }
  | { type: 'error'; error: unknown };

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

export interface ValidateOptions {
  configPath?: string;
}

export async function runValidate(options: ValidateOptions): Promise<ValidationResult[]> {
  const configDir = resolveConfigDir(options.configPath);
  const config = await loadConfig(configDir);
  const ir = await parseArtifacts(configDir, config);
  return validate(ir, config);
}

// ── Diff ──────────────────────────────────────────────────────────────────────

export interface DiffOptions {
  configPath?: string;
  projectRootOverride?: string;
  targets?: string[];
}

export interface DiffResult {
  diff: DiffEntry[];
  outputDir: string;
}

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
  const diff = computeDiff(files, outputDir);

  return { diff, outputDir };
}

// ── Initialize (agent-native files → .agentconfig/) ──────────────────────────

export interface RunInitializeOptions {
  sourceDir: string;
  from?: string[];
}

export interface InitializeResult {
  sourceDir: string;
  configDir: string;
  detectedAgents: DetectedAgent[];
  instructionCount: number;
  agentCount: number;
}

export async function runInitialize(options: RunInitializeOptions): Promise<InitializeResult> {
  const { from } = options;
  const sourceDir = path.resolve(options.sourceDir);
  const configDir = path.join(sourceDir, '.agentconfig');

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  if (!fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Source path is not a directory: ${sourceDir}`);
  }

  const detectedAgents = detectAgents(sourceDir);
  if (detectedAgents.length === 0) {
    return { sourceDir, configDir, detectedAgents: [], instructionCount: 0, agentCount: 0 };
  }

  if (fs.existsSync(configDir)) {
    throw new Error(`.agentconfig/ already exists at ${configDir}.`);
  }

  const ir = await importArtifacts(sourceDir, { from: from?.length ? from : undefined });
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

// ── Import (.agentconfig/ → .agentconfig/) ────────────────────────────────────

export interface RunImportOptions {
  /** Directory containing the source .agentconfig/ to import from. */
  sourceDir: string;
  /** Destination directory (default: CWD). A .agentconfig/ will be created here if absent. */
  destDir?: string;
}

export interface ImportResult {
  sourceConfigDir: string;
  destConfigDir: string;
  instructionCount: number;
  agentCount: number;
}

export async function runImport(options: RunImportOptions): Promise<ImportResult> {
  const { sourceDir } = options;
  const destRoot = options.destDir ? path.resolve(options.destDir) : process.cwd();

  const sourceConfigDir = resolveConfigDir(sourceDir);
  const sourceConfig = await loadConfig(sourceConfigDir);
  const sourceIr = await parseArtifacts(sourceConfigDir, sourceConfig);

  const existingDestConfigDir = findConfigDir(destRoot);
  const destConfigDir = existingDestConfigDir ?? path.join(destRoot, '.agentconfig');

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

// ── List Targets ──────────────────────────────────────────────────────────────

export async function listTargets(_configPath?: string): Promise<AgentGenerator[]> {
  await loadGlobalPlugins();
  return registry.list();
}
