import type { AgentConfig } from './config';
import type { ValidationResult } from './validation';



/** An agent detected in a project directory with a confidence level. */
export interface DetectedAgent {
  name: string;
  /** high = sentinel directory found; low = only a shared root file detected */
  confidence: 'high' | 'low';
}

export interface WriteOptions {
  outputDir?: string;
  overwrite?: boolean;
  dryRun?: boolean;
}

export type AgentHookEventMap = Partial<Record<string, string>>;

// ── Directive type plugin ─────────────────────────────────────────────────────

import type { InstructionType } from '../plugins/instruction-type';

/**
 * A plugin that adds a new directive type to agentconfig.
 *
 * Directive type plugins extend the `.agentconfig/` format with new kinds of
 * files (e.g. "workflows", "personas", "rules"). The type parameter `T` is the
 * directive item type.
 *
 * @example
 * // my-plugin.ts
 * class WorkflowDefinition implements InstructionType { ... }
 *
 * export const WorkflowPlugin: DirectiveTypePlugin<WorkflowDefinition> = {
 *   typeId: 'workflows',
 *   displayName: 'Workflows',
 *   parse(configDir) { ... },
 *   write(items, configDir, opts) { ... },
 *   validate(items, config) { ... },
 * };
 */
export interface DirectiveTypePlugin<T extends InstructionType = InstructionType> {
  /** Unique identifier for this directive type (must match T.typeId). */
  readonly typeId: string;
  /** Human-readable display name. */
  readonly displayName: string;
  /** Parse items of this type from a `.agentconfig/` directory. */
  parse(configDir: string): Promise<T[]> | T[];
  /** Write items back to a `.agentconfig/` directory (used by `writeAgentConfigDir`). */
  write?(items: T[], configDir: string, opts?: WriteOptions): Promise<void> | void;
  /** Validate items against the active config, returning any errors/warnings. */
  validate?(items: T[], config: AgentConfig): ValidationResult[];
}
