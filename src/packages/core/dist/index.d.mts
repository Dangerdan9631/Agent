import { z } from 'zod';

type ActivationType = 'always' | 'scoped' | 'ai-decided' | 'manual';
type HookEventName = 'SessionStart' | 'SessionEnd' | 'PreToolUse' | 'PostToolUse' | 'SubagentStart' | 'SubagentStop' | 'PreCompact' | 'UserPromptSubmit' | 'PermissionRequest';
type HookType = 'command' | 'http' | 'prompt' | 'agent';
/** A single instruction file from `.agentconfig/instructions/` */
interface InstructionFile {
    /** Stem of the source filename (e.g. `01-coding-standards`) */
    name: string;
    /** Absolute path to the source file */
    sourcePath: string;
    activation: ActivationType;
    /** Required when activation === 'scoped' */
    globs?: string[];
    /** Required when activation === 'ai-decided'; also useful for 'manual' */
    description?: string;
    /** Invocation slug — overrides filename as the trigger/reference name */
    slug: string;
    /** Restrict generation to only these targets */
    targets?: string[];
    /** Exclude these targets after the targets filter */
    excludedTargets?: string[];
    /** Markdown body (frontmatter stripped) */
    body: string;
    /** Human-readable note added during import when activation is ambiguous */
    importNote?: string;
}
/** A subagent / custom-agent definition from `.agentconfig/agents/` */
interface AgentDefinition {
    name: string;
    sourcePath: string;
    description?: string;
    model?: string;
    tools?: string[];
    targets?: string[];
    excludedTargets?: string[];
    isolation?: 'worktree' | null;
    sandbox_mode?: 'read-only' | 'workspace-write' | 'danger-full-access';
    reasoning_effort?: 'low' | 'medium' | 'high';
    /** System prompt / body */
    body: string;
    /** Additional frontmatter fields not covered above */
    extra?: Record<string, unknown>;
}
/** A single file inside a skill directory */
interface SkillFile {
    /** Path relative to the skill root directory, using forward slashes */
    relativePath: string;
    content: string;
}
/** An agentskills.io-compatible skill from `.agentconfig/skills/<name>/` */
interface SkillDefinition {
    name: string;
    /** Absolute path to the skill root directory */
    sourcePath: string;
    files: SkillFile[];
}
/** A manually-invoked prompt/workflow from `.agentconfig/commands/` */
interface CommandDefinition {
    name: string;
    /** Invocation slug derived from filename or `name` frontmatter field */
    slug: string;
    sourcePath: string;
    body: string;
    targets?: string[];
    excludedTargets?: string[];
}
/** A lifecycle hook definition from `hooks/hooks.yaml` */
interface HookDefinition {
    name: string;
    event: HookEventName;
    /** Regex / string to filter which tool / source fires this hook */
    matcher?: string;
    type: HookType;
    /** Shell command to execute (for type === 'command') */
    command?: string;
    timeout?: number;
    /** When true, a non-zero exit blocks the triggering action */
    blocking?: boolean;
    /** Claude Code async mode */
    async?: boolean;
    targets?: string[];
    excludedTargets?: string[];
}
/**
 * Open extension bag for custom directive types contributed by plugins.
 *
 * Plugin packages augment this interface via declaration merging to gain
 * full type safety for their directive data:
 * @example
 * declare module 'agentconfig' {
 *   interface IRExtensions {
 *     workflows: WorkflowDefinition[];
 *   }
 * }
 */
interface IRExtensions extends Record<string, unknown[]> {
}
/** Root container — the normalized intermediate representation */
interface IR {
    instructions: InstructionFile[];
    agents: AgentDefinition[];
    skills: SkillDefinition[];
    commands: CommandDefinition[];
    hooks: HookDefinition[];
    /** Directive data contributed by registered DirectiveTypePlugins */
    extensions: IRExtensions;
}

declare const AgentConfigSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodNumber>;
    targets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    options: z.ZodDefault<z.ZodObject<{
        overwrite: z.ZodDefault<z.ZodBoolean>;
        output_dir: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        overwrite: boolean;
        output_dir: string;
    }, {
        overwrite?: boolean | undefined;
        output_dir?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: number;
    options: {
        overwrite: boolean;
        output_dir: string;
    };
    targets: string[];
}, {
    version?: number | undefined;
    options?: {
        overwrite?: boolean | undefined;
        output_dir?: string | undefined;
    } | undefined;
    targets?: string[] | undefined;
}>;
type AgentConfig = z.infer<typeof AgentConfigSchema>;

type ValidationLevel = 'error' | 'warning' | 'info';
interface ValidationResult {
    level: ValidationLevel;
    message: string;
    /** Absolute path to the source file that triggered this result (if applicable) */
    file?: string;
}

/** A file to be written to the output directory */
interface FileOutput {
    /** Path relative to the output directory, using forward slashes */
    path: string;
    content: string;
}
/** Input passed to every generator's `generate()` method */
interface GeneratorInput {
    ir: IR;
    config: AgentConfig;
    /** The specific target ID being generated (e.g. `"copilot"`, `"cursor-cli"`) */
    target: string;
}
/** Plugin interface — implement this to add a new generation target */
interface AgentGenerator {
    /** Unique target identifier registered in the registry (e.g. `"copilot"`) */
    readonly target: string;
    /** Human-readable name shown in `list-targets` output */
    readonly displayName: string;
    generate(input: GeneratorInput): FileOutput[];
}
/** An agent detected in a project directory with a confidence level. */
interface DetectedAgent {
    name: string;
    /** high = sentinel directory found; low = only a shared root file detected */
    confidence: 'high' | 'low';
}
/** Data returned by an `AgentTargetPlugin`'s `importSource()` method. */
interface AgentImportResult {
    instructions: InstructionFile[];
    agents?: AgentDefinition[];
}
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
interface AgentTargetPlugin extends AgentGenerator {
    /** Import agent-native files from a project directory into normalized IR. */
    importSource(sourceDir: string): Promise<AgentImportResult>;
    /**
     * Detect whether this agent is present in a project directory.
     * Return `{ confidence: 'high' | 'low' }` if detected, or `null` if not.
     */
    detect?(dir: string): {
        confidence: 'high' | 'low';
    } | null;
}
/** Options forwarded to `DirectiveTypePlugin.write()`. */
interface WriteOptions$1 {
    overwrite?: boolean;
    dryRun?: boolean;
}
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
 * declare module 'agentconfig' {
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
interface DirectiveTypePlugin<T = unknown> {
    /** Unique identifier for this directive type — used as key in `IRExtensions`. */
    readonly typeId: string;
    /** Human-readable display name. */
    readonly displayName: string;
    /** Parse items of this type from a `.agentconfig/` directory. */
    parse(configDir: string): Promise<T[]> | T[];
    /** Write items back to a `.agentconfig/` directory (used by `writeAgentConfigDir`). */
    write?(items: T[], configDir: string, opts?: WriteOptions$1): void;
    /** Validate items against the active config, returning any errors/warnings. */
    validate?(items: T[], config: AgentConfig): ValidationResult[];
}

/** Probe a project directory for agent-native files and return detected agents. */
declare function detectAgents(dir: string): DetectedAgent[];
interface ImportOptions {
    /** Only import from these specific agents (default: all detected) */
    from?: string[];
    /** Merge into an existing .agentconfig/ rather than erroring */
    merge?: boolean;
    /** Overwrite the existing .agentconfig/ without prompting */
    overwrite?: boolean;
}
/**
 * Scan a project directory for agent-native files, reverse-parse them to IR,
 * deduplicate instructions by content similarity, and return a normalized IR.
 */
declare function importArtifacts(sourceDir: string, opts?: ImportOptions): Promise<IR>;
/**
 * Write a normalized IR back to a `.agentconfig/` directory structure.
 * Used by the `import` CLI command.
 */
declare function writeAgentConfigDir(ir: IR, config: AgentConfig, configDir: string, opts?: {
    overwrite?: boolean;
    dryRun?: boolean;
}): Promise<void>;

/**
 * Validate a parsed IR against the agent config.
 * Returns an array of ValidationResult entries (errors, warnings, and infos).
 * An empty array means validation passed cleanly.
 */
declare function validate(ir: IR, config: AgentConfig): ValidationResult[];

interface WriteOptions {
    outputDir: string;
    /** When false, skip files that already exist on disk. Default: true */
    overwrite?: boolean;
    /** When true, do not write any files (dry-run mode). Default: false */
    dryRun?: boolean;
}
type DiffAction = 'create' | 'update' | 'unchanged';
interface DiffEntry {
    path: string;
    action: DiffAction;
    /** Unified diff string (present for 'create' and 'update' only) */
    diff?: string;
}
declare function clearHashCache(): void;
/**
 * Deduplicate a list of FileOutput entries by path (first-write-wins).
 * This handles the case where multiple generators emit to the same shared path
 * (e.g. `.agents/skills/<name>/` emitted by copilot, cursor, antigravity, etc.).
 */
declare function deduplicateOutputs(files: FileOutput[]): FileOutput[];
/**
 * Compare a list of FileOutput entries against the current on-disk state.
 * Returns a DiffEntry for every file.  Input is deduplicated before comparison.
 */
declare function computeDiff(files: FileOutput[], outputDir: string): DiffEntry[];
/**
 * Write a list of FileOutput entries to disk.
 *
 * - Deduplicates by path (first-write-wins).
 * - Skips files whose content matches the last-written hash (useful in --watch mode).
 * - Respects `overwrite: false` and `dryRun: true` options.
 */
declare function write(files: FileOutput[], opts: WriteOptions): Promise<void>;

interface GenerateOptions {
    configPath?: string;
    projectRootOverride?: string;
    targets?: string[];
    overwrite?: boolean;
}
interface GenerateResult {
    configDir: string;
    outputDir: string;
    /** Effective target list (from options or config) */
    targets: string[];
    /** Non-empty when config validation failed; no files were written */
    validationErrors: ValidationResult[];
    /** Number of files written */
    fileCount: number;
}
declare function runGenerate(options: GenerateOptions): Promise<GenerateResult>;
interface ValidateOptions {
    configPath?: string;
}
declare function runValidate(options: ValidateOptions): Promise<ValidationResult[]>;
interface DiffOptions {
    configPath?: string;
    projectRootOverride?: string;
    targets?: string[];
}
interface DiffResult {
    diff: DiffEntry[];
    outputDir: string;
}
declare function runDiff(options: DiffOptions): Promise<DiffResult>;
interface RunInitializeOptions {
    sourceDir: string;
    from?: string[];
    overwrite?: boolean;
    dryRun?: boolean;
}
interface InitializeResult {
    configDir: string;
    detectedAgents: DetectedAgent[];
    instructionCount: number;
    agentCount: number;
}
declare function runInitialize(options: RunInitializeOptions): Promise<InitializeResult>;
interface RunImportOptions {
    /** Directory containing the source .agentconfig/ to import from. */
    sourceDir: string;
    /** Destination directory (default: CWD). A .agentconfig/ will be created here if absent. */
    destDir?: string;
    /** Overwrite existing instruction files in the destination (default: skip). */
    overwrite?: boolean;
    dryRun?: boolean;
}
interface ImportResult {
    sourceConfigDir: string;
    destConfigDir: string;
    instructionCount: number;
    agentCount: number;
}
declare function runImport(options: RunImportOptions): Promise<ImportResult>;
declare function listTargets(configPath?: string): Promise<AgentGenerator[]>;

/**
 * Walk upward from `startDir` to find the `.agentconfig/` directory.
 * Returns the absolute path to the directory, or `null` if not found.
 */
declare function findConfigDir(startDir: string): string | null;
/**
 * Locate the `.agentconfig/` directory starting from `startDir` (defaults to
 * `process.cwd()`). Throws an `Error` if no directory is found.
 */
declare function resolveConfigDir(startDir?: string): string;
/**
 * Load and validate `config.yaml` from the given `.agentconfig/` directory.
 * Any properties in `overrides` are merged on top of the file contents.
 */
declare function loadConfig(configDir: string, overrides?: Partial<AgentConfig>): Promise<AgentConfig>;

/**
 * All built-in target names, in registration order.
 * These are the generators that ship with agentconfig and are auto-registered on import.
 */
declare const BUILT_IN_TARGETS: readonly ["copilot", "copilot-cli", "cursor", "claude-code", "gemini-cli", "antigravity", "codex", "windsurf", "windsurf-cli", "cline"];
type BuiltInTarget = (typeof BUILT_IN_TARGETS)[number];
declare const GlobalToolConfigSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodNumber>;
    /**
     * Plugin IDs to register. Built-in target names (e.g. `copilot`, `cursor`)
     * are listed here for reference — they are auto-registered and do not need
     * to be imported. Any other entry is treated as a module path or npm package
     * name and loaded via dynamic import.
     */
    plugins: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    version: number;
    plugins: string[];
}, {
    version?: number | undefined;
    plugins?: string[] | undefined;
}>;
type GlobalToolConfig = z.infer<typeof GlobalToolConfigSchema>;
/** Returns the path to the global config directory: `~/.agentconfig/`. */
declare function getGlobalConfigDir(): string;
/** Returns the path to the global config file: `~/.agentconfig/config.yaml`. */
declare function getGlobalConfigPath(): string;
/**
 * Load the global tool config from `~/.agentconfig/config.yaml`.
 * Returns defaults (all built-in plugins listed) if the file does not exist.
 */
declare function loadGlobalConfig(): Promise<GlobalToolConfig>;
/**
 * Create `~/.agentconfig/config.yaml` with all built-in plugins listed, if it
 * does not already exist. This is a no-op when the file is already present.
 */
declare function ensureGlobalConfig(): void;
/**
 * Load external (non-built-in) plugins listed in `~/.agentconfig/config.yaml`
 * and register them with the global registry. Built-in target names are
 * skipped because they are already auto-registered on import.
 */
declare function loadGlobalPlugins(): Promise<void>;

/**
 * Parse all artifacts from a `.agentconfig/` directory into a normalized IR.
 * Built-in directive types (instructions, agents, skills, commands, hooks) are
 * always parsed. Registered DirectiveTypePlugins are invoked for any additional
 * custom directive types, with results stored in `ir.extensions`.
 */
declare function parseArtifacts(configDir: string, _config: AgentConfig): Promise<IR>;

type AgentImportFn = (sourceDir: string) => Promise<{
    instructions: InstructionFile[];
    agents?: AgentDefinition[];
}>;
type DetectFn = (dir: string) => DetectedAgent[];
/**
 * Central plugin registry — stores generators, importers, detectors, and
 * directive type plugins. All built-in agents register themselves here on
 * module load; third-party plugins register via `loadPlugin()`.
 */
declare class PluginRegistry {
    private readonly generators;
    private readonly importers;
    private readonly detectors;
    private readonly directiveTypes;
    /** Register a generator. Overwrites any existing entry for the same target. */
    register(generator: AgentGenerator): void;
    /** Look up a generator by target ID. Returns `undefined` if not registered. */
    get(target: string): AgentGenerator | undefined;
    /** Return all registered generators in insertion order. */
    list(): AgentGenerator[];
    /** Register an importer function for a target. Overwrites existing entry. */
    registerImporter(target: string, fn: AgentImportFn): void;
    /** Look up an importer by target ID. Returns `undefined` if not registered. */
    getImporter(target: string): AgentImportFn | undefined;
    /** Return all registered importer entries as an array of `[target, fn]` pairs. */
    listImporters(): Array<[string, AgentImportFn]>;
    /** Register a detector function that probes a directory for an agent's presence. */
    registerDetector(fn: DetectFn): void;
    /** Return all registered detector functions. */
    listDetectors(): DetectFn[];
    /** Register a directive type plugin. Overwrites existing entry for the same typeId. */
    registerDirectiveType(plugin: DirectiveTypePlugin): void;
    /** Look up a directive type plugin by typeId. */
    getDirectiveType(typeId: string): DirectiveTypePlugin | undefined;
    /** Return all registered directive type plugins in insertion order. */
    listDirectiveTypes(): DirectiveTypePlugin[];
    /**
     * Dynamically load a plugin module by its Node module identifier and
     * register whatever it exports. Supports:
     * - `AgentTargetPlugin` (`{ target, generate, importSource }`)
     * - `DirectiveTypePlugin` (`{ typeId, parse }`)
     * - Legacy `AgentGenerator` (`{ target, generate }`) — backward compatible
     * - An array of any of the above
     */
    loadPlugin(moduleId: string): Promise<void>;
    private _registerOne;
}
/** Singleton registry — all built-in plugins self-register here on import */
declare const registry: PluginRegistry;

/**
 * Run all registered generators (or a filtered subset) on the IR and return
 * a deduplicated list of file outputs.
 */
declare function generate(ir: IR, config: AgentConfig, targetFilter?: string[]): FileOutput[];

export { type ActivationType, type AgentConfig, type AgentDefinition, type AgentGenerator, type AgentImportResult, type AgentTargetPlugin, BUILT_IN_TARGETS, type BuiltInTarget, type CommandDefinition, type DetectedAgent, type DiffEntry, type DiffOptions, type DiffResult, type DirectiveTypePlugin, type FileOutput, type GenerateOptions, type GenerateResult, type GeneratorInput, PluginRegistry as GeneratorRegistry, type GlobalToolConfig, type HookDefinition, type HookEventName, type HookType, type IR, type IRExtensions, type ImportOptions, type ImportResult, type InitializeResult, type InstructionFile, PluginRegistry, type RunImportOptions, type RunInitializeOptions, type SkillDefinition, type SkillFile, type ValidateOptions, type ValidationLevel, type ValidationResult, type WriteOptions$1 as WriteOptions, clearHashCache, computeDiff, deduplicateOutputs, detectAgents, ensureGlobalConfig, findConfigDir, generate, getGlobalConfigDir, getGlobalConfigPath, importArtifacts, listTargets, loadConfig, loadGlobalConfig, loadGlobalPlugins, parseArtifacts, registry, resolveConfigDir, runDiff, runGenerate, runImport, runInitialize, runValidate, validate, write, writeAgentConfigDir };
