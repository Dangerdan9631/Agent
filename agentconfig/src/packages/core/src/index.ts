// Self-register all built-in generators
import './generators/index';
// Self-register all built-in importers and detectors
import './importers/index';

// ─── Operations (high-level orchestration) ────────────────────────────────────
export {
  runGenerate,
  runValidate,
  runDiff,
  runInitialize,
  runImport,
  listTargets,
} from './operations';

export type {
  GenerateEvent,
  GenerateOptions,
  GenerateResult,
  ValidateOptions,
  DiffOptions,
  DiffResult,
  RunInitializeOptions,
  InitializeResult,
  RunImportOptions,
  ImportResult,
} from './operations';

// ─── Config ───────────────────────────────────────────────────────────────────
export { findConfigDir, loadConfig, resolveConfigDir } from './config';

// ─── Global tool config ───────────────────────────────────────────────────────
export {
  BUILT_IN_TARGETS,
  getGlobalConfigDir,
  getGlobalConfigPath,
  loadGlobalConfig,
  ensureGlobalConfig,
  loadGlobalPlugins,
} from './global-config';
export type { GlobalToolConfig, BuiltInTarget } from './global-config';

// ─── Parsers ──────────────────────────────────────────────────────────────────
export { parseArtifacts } from './parsers/index';

// ─── Registry & plugins ───────────────────────────────────────────────────────
export { registry, PluginRegistry, GeneratorRegistry } from './registry';

// ─── Generate ─────────────────────────────────────────────────────────────────
import type { IR } from './types/ir';
import type { AgentConfig } from './types/config';
import type { FileOutput } from './types/generator';
import { registry as _registry } from './registry';
import { deduplicateOutputs } from './writer';

/**
 * Run all registered generators (or a filtered subset) on the IR and return
 * a deduplicated list of file outputs.
 */
export function generate(
  ir: IR,
  config: AgentConfig,
  targetFilter?: string[],
): FileOutput[] {
  const targets =
    targetFilter && targetFilter.length > 0
      ? targetFilter
      : config.targets;

  const outputs: FileOutput[] = [];
  for (const target of targets) {
    const gen = _registry.get(target);
    if (!gen) continue;
    outputs.push(...gen.generate({ ir, config, target }));
  }
  return deduplicateOutputs(outputs);
}

// ─── Writer ───────────────────────────────────────────────────────────────────
export { write, computeDiff, deduplicateOutputs, clearHashCache } from './writer';

// ─── Validator ────────────────────────────────────────────────────────────────
export { validate } from './validator';

// ─── Importers ────────────────────────────────────────────────────────────────
export {
  importArtifacts,
  detectAgents,
  writeAgentConfigDir,
} from './importers/index';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  IR,
  IRExtensions,
  InstructionFile,
  AgentDefinition,
  SkillDefinition,
  SkillFile,
  CommandDefinition,
  HookDefinition,
  HookType,
  HookEventName,
  ActivationType,
} from './types/ir';

export type {
  AgentGenerator,
  AgentTargetPlugin,
  AgentImportResult,
  DirectiveTypePlugin,
  WriteOptions,
  DetectedAgent,
  FileOutput,
  GeneratorInput,
} from './types/generator';

export type {
  AgentConfig,
} from './types/config';

export type {
  ValidationLevel,
  ValidationResult,
} from './types/validation';

export type {
  DiffEntry,
} from './writer';

export type {
  ImportOptions,
} from './importers/index';
