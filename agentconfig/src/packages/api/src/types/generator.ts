import type { IR, InstructionFile, AgentDefinition } from './ir';
import type { AgentConfig } from './config';
import type { ValidationResult } from './validation';

/** A file to be written to the output directory */
export interface FileOutput {
  /** Path relative to the output directory, using forward slashes */
  path: string;
  content: string;
}

/** Input passed to every generator's `generate()` method */
export interface GeneratorInput {
  ir: IR;
  config: AgentConfig;
  /** The specific target ID being generated (e.g. `"copilot"`, `"cursor-cli"`) */
  target: string;
}

/** Plugin interface — implement this to add a new generation target */
export interface AgentGenerator {
  /** Unique target identifier registered in the registry (e.g. `"copilot"`) */
  readonly target: string;
  /** Human-readable name shown in `list-targets` output */
  readonly displayName: string;
  generate(input: GeneratorInput): FileOutput[];
}

// ── Agent detection ───────────────────────────────────────────────────────────

/** An agent detected in a project directory with a confidence level. */
export interface DetectedAgent {
  name: string;
  /** high = sentinel directory found; low = only a shared root file detected */
  confidence: 'high' | 'low';
}

// ── Import result ─────────────────────────────────────────────────────────────

/** Data returned by an `AgentTargetPlugin`'s `importSource()` method. */
export interface AgentImportResult {
  instructions: InstructionFile[];
  agents?: AgentDefinition[];
}

// ── Write options ─────────────────────────────────────────────────────────────

/** Options forwarded to `DirectiveTypePlugin.write()`. */
export interface WriteOptions {
  overwrite?: boolean;
  dryRun?: boolean;
}

// ── Combined agent target plugin ──────────────────────────────────────────────

/**
 * A combined plugin that handles both generation and import for one agent target.
 *
 * Third-party plugins should implement this interface to support a new agent.
 * Built-in agents remain as separate generator + importer files and register
 * their pieces individually into the registry for backwards compatibility.
 *
 * @example
 * export const MyAgentPlugin: AgentTargetPlugin = {
 *   target: 'my-agent',
 *   displayName: 'My Agent',
 *   generate({ ir, target }) { ... },
 *   async importSource(sourceDir) { ... },
 *   detect(dir) { return fs.existsSync(path.join(dir, '.myagent')) ? { confidence: 'high' } : null; },
 * };
 */
export interface AgentTargetPlugin extends AgentGenerator {
  /** Import agent-native files from a project directory into normalized IR. */
  importSource(sourceDir: string): Promise<AgentImportResult>;
  /**
   * Detect whether this agent is present in a project directory.
   * Return `{ confidence: 'high' | 'low' }` if detected, or `null` if not.
   */
  detect?(dir: string): { confidence: 'high' | 'low' } | null;
}

// ── Directive type plugin ─────────────────────────────────────────────────────

/**
 * A plugin that adds a new directive type to agentconfig.
 *
 * Directive type plugins extend the `.agentconfig/` format with new kinds of
 * files (e.g. "workflows", "personas", "rules"). The type parameter `T` is the
 * directive item type; augment `IRExtensions` for full type safety:
 *
 * @example
 * // my-plugin.ts
 * export interface WorkflowDefinition { name: string; steps: string[]; }
 *
 * declare module 'agentconfig-api' {
 *   interface IRExtensions { workflows: WorkflowDefinition[]; }
 * }
 *
 * export const WorkflowPlugin: DirectiveTypePlugin<WorkflowDefinition> = {
 *   typeId: 'workflows',
 *   displayName: 'Workflows',
 *   parse(configDir) { ... },
 *   write(items, configDir, opts) { ... },
 *   validate(items, config) { ... },
 * };
 */
export interface DirectiveTypePlugin<T = unknown> {
  /** Unique identifier for this directive type — used as key in `IRExtensions`. */
  readonly typeId: string;
  /** Human-readable display name. */
  readonly displayName: string;
  /** Parse items of this type from a `.agentconfig/` directory. */
  parse(configDir: string): Promise<T[]> | T[];
  /** Write items back to a `.agentconfig/` directory (used by `writeAgentConfigDir`). */
  write?(items: T[], configDir: string, opts?: WriteOptions): void;
  /** Validate items against the active config, returning any errors/warnings. */
  validate?(items: T[], config: AgentConfig): ValidationResult[];
}
