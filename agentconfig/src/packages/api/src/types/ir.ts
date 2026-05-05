// Normalized activation types for instruction files
export type ActivationType = 'always' | 'scoped' | 'ai-decided' | 'manual';

// All normalized lifecycle hook events (translated per-agent by generators)
export type HookEventName =
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PreCompact'
  | 'UserPromptSubmit'
  | 'PermissionRequest';

export type HookType = 'command' | 'http' | 'prompt' | 'agent';

/** A single instruction file from `.agentconfig/instructions/` */
export interface InstructionFile {
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
export interface AgentDefinition {
  name: string;
  sourcePath: string;
  description?: string;
  model?: string;
  tools?: string[];
  targets?: string[];
  excludedTargets?: string[];
  // Claude Code specific
  isolation?: 'worktree' | null;
  // Codex specific
  sandbox_mode?: 'read-only' | 'workspace-write' | 'danger-full-access';
  reasoning_effort?: 'low' | 'medium' | 'high';
  /** System prompt / body */
  body: string;
  /** Additional frontmatter fields not covered above */
  extra?: Record<string, unknown>;
}

/** A single file inside a skill directory */
export interface SkillFile {
  /** Path relative to the skill root directory, using forward slashes */
  relativePath: string;
  content: string;
}

/** An agentskills.io-compatible skill from `.agentconfig/skills/<name>/` */
export interface SkillDefinition {
  name: string;
  /** Absolute path to the skill root directory */
  sourcePath: string;
  files: SkillFile[];
}

/** A manually-invoked prompt/workflow from `.agentconfig/commands/` */
export interface CommandDefinition {
  name: string;
  /** Invocation slug derived from filename or `name` frontmatter field */
  slug: string;
  sourcePath: string;
  body: string;
  targets?: string[];
  excludedTargets?: string[];
}

/** A lifecycle hook definition from `hooks/hooks.yaml` */
export interface HookDefinition {
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
 * declare module 'agentconfig-api' {
 *   interface IRExtensions {
 *     workflows: WorkflowDefinition[];
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IRExtensions extends Record<string, unknown[]> {}

/** Root container — the normalized intermediate representation */
export interface IR {
  instructions: InstructionFile[];
  agents: AgentDefinition[];
  skills: SkillDefinition[];
  commands: CommandDefinition[];
  hooks: HookDefinition[];
  /** Directive data contributed by registered DirectiveTypePlugins */
  extensions: IRExtensions;
}
