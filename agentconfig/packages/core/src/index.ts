// Self-register all built-in generators
import './generators/index';

// ─── Config ───────────────────────────────────────────────────────────────────
export { findConfigDir, loadConfig } from './config';

// ─── Parsers ──────────────────────────────────────────────────────────────────
export { parseArtifacts } from './parsers/index';

// ─── Registry & plugins ───────────────────────────────────────────────────────
export { registry } from './registry';

/** Load all plugin generators listed in config.plugins. */
export async function loadPlugins(config: import('./types/config').AgentConfig): Promise<void> {
  if (!config.plugins || config.plugins.length === 0) return;
  const { registry: reg } = await import('./registry');
  for (const plugin of config.plugins) {
    await reg.loadPlugin(plugin);
  }
}

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
  FileOutput,
  GeneratorInput,
} from './types/generator';

export type {
  AgentConfig,
} from './types/config';

export type {
  ValidationResult,
} from './validator';

export type {
  DiffEntry,
} from './writer';

export type {
  DetectedAgent,
  ImportOptions,
} from './importers/index';
