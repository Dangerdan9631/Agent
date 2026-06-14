import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import fse from 'fs-extra';

import { readWorkflowConfig } from '../workflow/artifacts.js';
import { listSetLists } from '../setlists/index.js';
import { assessTriage, type TriageAssessment, type TriageInput } from '../specs/triage.js';
import {
  parseExtensionManifest,
  type ExtensionHook,
  type ExtensionManifest,
  type ExtensionStep,
} from './manifest.js';

/**
 * Implicit workflow step ids that are not listed in workflow.config.json but are
 * still valid hook targets and extension replacement slots.
 */
export const IMPLICIT_WORKFLOW_STEP_IDS = ['triage'] as const;

/**
 * On-demand workflow step ids merged into the step registry for hook validation.
 */
export const ON_DEMAND_WORKFLOW_STEP_IDS = ['clarify', 'analyze'] as const;

/**
 * Context passed to extension handlers when invoked through dynamic import().
 */
export interface ExtensionHandlerContext extends Record<string, unknown> {
  /** Absolute path to the project root. */
  projectRoot: string;
  /** Open workflow step id the handler is replacing or augmenting. */
  stepId: string;
  /** Extension registration id from workflow.config.json. */
  extensionId: string;
  /** Project-relative path to the extension manifest file. */
  manifestPath: string;
}

/**
 * One enabled or disabled extension loaded from workflow configuration.
 */
export interface LoadedExtension {
  /** Extension registration id from workflow.config.json. */
  id: string;
  /** Whether the extension registration is active in workflow.config.json. */
  enabled: boolean;
  /** Project-relative path to the extension manifest file. */
  manifestPath: string;
  /** Parsed and validated extension manifest. */
  manifest: ExtensionManifest;
}

/**
 * Registry of loaded extensions, merged step ids, and non-blocking hook warnings.
 */
export interface ExtensionRegistry {
  /** All extension registrations discovered in workflow.config.json. */
  extensions: LoadedExtension[];
  /** Union of built-in, implicit, on-demand, and extension-defined step ids. */
  mergedStepIds: Set<string>;
  /** Human-readable warnings for hooks targeting unknown step ids. */
  hookWarnings: string[];
  /** Hook event names skipped because their step id is not registered. */
  skippedHooks: string[];
}

/**
 * Result of resolving which handler should execute for a workflow step slot.
 */
export interface ResolvedStepHandler {
  /** Whether the built-in handler or an extension handler is active. */
  kind: 'built-in' | 'extension';
  /** Open workflow step id being resolved. */
  stepId: string;
  /** Active extension id when kind is `extension`. */
  extensionId?: string;
  /** Project-relative entrypoint when kind is `extension`. */
  entrypoint?: string;
  /** Winning priority value when multiple extensions target the same step id. */
  priority?: number;
  /** Developer-facing notice describing the active handler selection. */
  activeHandlerNotice: string;
}

/**
 * Candidate extension step used while resolving handler priority.
 */
interface ExtensionStepCandidate {
  /** Extension registration id. */
  extensionId: string;
  /** Project-relative manifest path for the owning extension. */
  manifestPath: string;
  /** Extension step contribution from the manifest. */
  step: ExtensionStep;
}

/**
 * Parses a dynamic hook event into its phase and target step id.
 *
 * @param event - Hook event such as `before_specify` or `after_plan`.
 * @returns Parsed phase and step id, or null when the event is malformed.
 */
export function parseHookEvent(
  event: string,
): { phase: 'before' | 'after'; stepId: string } | null {
  const match = /^(before|after)_(.+)$/.exec(event);
  if (match == null) {
    return null;
  }

  return {
    phase: match[1] as 'before' | 'after',
    stepId: match[2]!,
  };
}

/**
 * Validates extension hooks against the merged step registry and returns warnings.
 *
 * @param hooks - Hook contributions from an extension manifest.
 * @param mergedStepIds - Registered workflow step ids available for hook dispatch.
 * @returns Warning messages for hooks targeting unknown step ids.
 */
export function validateExtensionHooks(
  hooks: readonly ExtensionHook[] | undefined,
  mergedStepIds: ReadonlySet<string>,
): string[] {
  if (hooks == null || hooks.length === 0) {
    return [];
  }

  const warnings: string[] = [];
  for (const hook of hooks) {
    const parsed = parseHookEvent(hook.event);
    if (parsed == null) {
      continue;
    }

    if (!mergedStepIds.has(parsed.stepId)) {
      warnings.push(
        `Extension hook "${hook.event}" targets unknown step id "${parsed.stepId}" and will be skipped.`,
      );
    }
  }

  return warnings;
}

/**
 * Builds the merged workflow step registry from config steps and extension contributions.
 *
 * @param configStepIds - Step ids declared in workflow.config.json.
 * @param extensions - Loaded extension registrations.
 * @returns Set of all registered workflow step ids.
 */
export function buildMergedStepRegistry(
  configStepIds: readonly string[],
  extensions: readonly LoadedExtension[],
): Set<string> {
  const merged = new Set<string>([
    ...configStepIds,
    ...IMPLICIT_WORKFLOW_STEP_IDS,
    ...ON_DEMAND_WORKFLOW_STEP_IDS,
  ]);

  for (const extension of extensions) {
    if (!extension.enabled) {
      continue;
    }

    for (const step of extension.manifest.steps ?? []) {
      merged.add(step.stepId);
    }
  }

  return merged;
}

/**
 * Loads and validates all extension manifests referenced by workflow.config.json.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Extension registry with merged step ids and hook warnings.
 */
export async function loadExtensionRegistry(projectRoot: string): Promise<ExtensionRegistry> {
  const config = await readWorkflowConfig(projectRoot);
  const configStepIds = config?.steps.map((step) => step.id) ?? [];
  const extensions: LoadedExtension[] = [];
  const hookWarnings: string[] = [];
  const skippedHooks: string[] = [];

  for (const extensionRef of config?.extensions ?? []) {
    const manifestPath = path.join(projectRoot, extensionRef.manifestPath);
    if (!(await fse.pathExists(manifestPath))) {
      console.warn(
        `Extension manifest not found: ${extensionRef.manifestPath}; skipping registration "${extensionRef.id}".`,
      );
      continue;
    }

    const raw: unknown = await fse.readJson(manifestPath);
    const manifest = parseExtensionManifest(raw);
    extensions.push({
      id: extensionRef.id,
      enabled: extensionRef.enabled,
      manifestPath: extensionRef.manifestPath,
      manifest,
    });
  }

  const mergedStepIds = buildMergedStepRegistry(configStepIds, extensions);

  for (const extension of extensions) {
    const warnings = validateExtensionHooks(extension.manifest.hooks, mergedStepIds);
    for (const warning of warnings) {
      hookWarnings.push(warning);
      console.warn(warning);

      const hook = extension.manifest.hooks?.find((entry) => warning.includes(entry.event));
      if (hook != null) {
        skippedHooks.push(hook.event);
      }
    }
  }

  return {
    extensions,
    mergedStepIds,
    hookWarnings,
    skippedHooks,
  };
}

/**
 * Resolves the active handler for a workflow step id using extension priority rules.
 *
 * @param registry - Loaded extension registry for the project.
 * @param stepId - Open workflow step id to resolve.
 * @returns Built-in fallback or the highest-priority enabled extension handler.
 */
export function resolveActiveStepHandler(
  registry: ExtensionRegistry,
  stepId: string,
): ResolvedStepHandler {
  const candidates: ExtensionStepCandidate[] = [];

  for (const extension of registry.extensions) {
    if (!extension.enabled) {
      continue;
    }

    for (const step of extension.manifest.steps ?? []) {
      if (step.stepId !== stepId) {
        continue;
      }

      if (step.enabledByDefault === false) {
        continue;
      }

      candidates.push({
        extensionId: extension.id,
        manifestPath: extension.manifestPath,
        step,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      kind: 'built-in',
      stepId,
      activeHandlerNotice: `Using built-in handler for step "${stepId}".`,
    };
  }

  candidates.sort((left, right) => (right.step.priority ?? 0) - (left.step.priority ?? 0));
  const winner = candidates[0]!;

  return {
    kind: 'extension',
    stepId,
    extensionId: winner.extensionId,
    entrypoint: winner.step.entrypoint,
    priority: winner.step.priority ?? 0,
    activeHandlerNotice:
      `Using extension "${winner.extensionId}" handler for step "${stepId}" ` +
      `(priority ${winner.step.priority ?? 0}).`,
  };
}

/**
 * Dynamically imports and invokes an extension handler module.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param entrypoint - Project-relative path to the handler module.
 * @param context - Context object forwarded to the exported handler function.
 * @returns Handler return value when invocation succeeds.
 */
export async function invokeExtensionHandler(
  projectRoot: string,
  entrypoint: string,
  context: Record<string, unknown>,
): Promise<unknown> {
  const absoluteEntrypoint = path.resolve(projectRoot, entrypoint);

  try {
    const moduleUrl = pathToFileURL(absoluteEntrypoint).href;
    const imported = (await import(moduleUrl)) as {
      handler?: (ctx: Record<string, unknown>) => unknown;
      default?: (ctx: Record<string, unknown>) => unknown;
    };
    const handler = imported.handler ?? imported.default;

    if (typeof handler !== 'function') {
      throw new Error(`Extension entrypoint "${entrypoint}" must export a handler function.`);
    }

    return await handler(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Extension handler failed for "${entrypoint}". ${message} ` +
        'Remediation: verify the entrypoint path, exported handler, and handler runtime errors.',
    );
  }
}

/**
 * Dispatches enabled before/after hooks for a workflow step.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param registry - Loaded extension registry for the project.
 * @param phase - Hook phase to dispatch.
 * @param stepId - Workflow step id whose hooks should run.
 * @param context - Context object forwarded to each hook handler.
 */
export async function dispatchStepHooks(
  projectRoot: string,
  registry: ExtensionRegistry,
  phase: 'before' | 'after',
  stepId: string,
  context: Record<string, unknown>,
): Promise<void> {
  const eventPrefix = `${phase}_${stepId}`;

  for (const extension of registry.extensions) {
    if (!extension.enabled) {
      continue;
    }

    for (const hook of extension.manifest.hooks ?? []) {
      if (hook.event !== eventPrefix) {
        continue;
      }

      if (registry.skippedHooks.includes(hook.event)) {
        continue;
      }

      try {
        await invokeExtensionHandler(projectRoot, hook.entrypoint, {
          ...context,
          projectRoot,
          stepId,
          extensionId: extension.id,
          manifestPath: extension.manifestPath,
          hookId: hook.id,
          hookEvent: hook.event,
        });
      } catch (error) {
        if (hook.optional === false) {
          throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Optional hook "${hook.event}" failed and was skipped: ${message}`);
      }
    }
  }
}

/**
 * Normalized agent-facing hook call payload returned during step lifecycle.
 */
export interface StepHookInstruction {
  /**
   * Lifecycle phase when the hook should be invoked.
   */
  phase: 'before' | 'after';
  /**
   * Slash command or extension command name for the agent to call.
   */
  command: string;
  /**
   * Human-readable purpose of the hook for agent prompts.
   */
  description: string;
  /**
   * Whether the agent may skip the hook after prompting.
   */
  optional: boolean;
  /**
   * Derived flag indicating the agent must call the hook before proceeding.
   */
  mandatory: boolean;
  /**
   * Whether the referenced command or handler entrypoint is available in the project.
   */
  available: boolean;
  /**
   * Optional prompt text shown for optional hooks.
   */
  prompt?: string;
  /**
   * Source registry that produced this hook instruction.
   */
  source: 'specify-extensions-yml' | 'workflow-extension-manifest';
  /**
   * Extension id when the hook originates from a registered extension.
   */
  extension?: string;
}

/**
 * Input for collecting hook instructions for one workflow step phase.
 */
export interface CollectHookInstructionsInput {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Workflow step id whose hooks should be collected.
   */
  stepId: string;
  /**
   * Lifecycle phase determining before or after hook events.
   */
  phase: 'before' | 'after';
}

/**
 * Result of collecting hook instructions from all configured hook sources.
 */
export interface CollectHookInstructionsResult {
  /**
   * Normalized hook instructions for the requested step phase.
   */
  instructions: StepHookInstruction[];
  /**
   * Non-blocking diagnostics for invalid or skipped hook configuration.
   */
  diagnostics: string[];
}

/**
 * Project-relative path to the Spec Kit extensions registry file.
 */
export const SPECIFY_EXTENSIONS_RELATIVE_PATH = '.specify/extensions.yml';

/**
 * One hook entry declared in `.specify/extensions.yml`.
 */
interface SpecifyExtensionsHookEntry {
  extension?: string;
  command?: string;
  enabled?: boolean;
  optional?: boolean;
  prompt?: string;
  description?: string;
  condition?: string | null;
}

/**
 * Top-level shape of `.specify/extensions.yml` relevant to hook collection.
 */
interface SpecifyExtensionsDocument {
  hooks?: Record<string, SpecifyExtensionsHookEntry[] | undefined>;
}

/**
 * Converts a dotted Spec Kit command name to a slash-command token.
 *
 * @param command - Command such as `speckit.agent-context.update`.
 * @returns Slash command token such as `speckit-agent-context-update`.
 */
function normalizeHookCommand(command: string): string {
  return command.replace(/\./g, '-');
}

/**
 * Result of reading `.specify/extensions.yml` for hook collection.
 */
interface ReadSpecifyExtensionsResult {
  /**
   * Parsed extensions document when the file is present and valid YAML.
   */
  document: SpecifyExtensionsDocument | null;
  /**
   * Non-blocking diagnostics for unreadable or invalid hook configuration.
   */
  diagnostics: string[];
}

/**
 * Checks whether a Spec Kit slash command skill is installed in the project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param normalizedCommand - Slash command token such as `speckit-agent-context-update`.
 * @returns True when `.agents/skills/{command}/SKILL.md` exists.
 */
async function isSpecifyHookCommandAvailable(
  projectRoot: string,
  normalizedCommand: string,
): Promise<boolean> {
  const skillPath = path.join(projectRoot, '.agents', 'skills', normalizedCommand, 'SKILL.md');
  return fse.pathExists(skillPath);
}

/**
 * Checks whether a workflow extension hook entrypoint exists on disk.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param entrypoint - Project-relative path to the hook handler module.
 * @returns True when the entrypoint file is present.
 */
async function isWorkflowHookEntrypointAvailable(
  projectRoot: string,
  entrypoint: string,
): Promise<boolean> {
  return fse.pathExists(path.join(projectRoot, entrypoint));
}

/**
 * Reads and parses `.specify/extensions.yml` when present.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Parsed document and non-blocking diagnostics for invalid configuration.
 */
async function readSpecifyExtensionsDocument(
  projectRoot: string,
): Promise<ReadSpecifyExtensionsResult> {
  const filePath = path.join(projectRoot, SPECIFY_EXTENSIONS_RELATIVE_PATH);
  if (!(await fse.pathExists(filePath))) {
    return { document: null, diagnostics: [] };
  }

  try {
    const rawText = await fse.readFile(filePath, 'utf8');
    const parsed = parse(rawText) as SpecifyExtensionsDocument;
    return { document: parsed, diagnostics: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      document: null,
      diagnostics: [
        `Could not read ${SPECIFY_EXTENSIONS_RELATIVE_PATH}: ${message}. Hook instructions from this source were skipped.`,
      ],
    };
  }
}

/**
 * Collects hook instructions from `.specify/extensions.yml` for one step phase.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param stepId - Workflow step id whose hooks should be collected.
 * @param phase - Lifecycle phase determining before or after hook events.
 * @returns Hook instructions and any non-blocking diagnostics.
 */
async function collectSpecifyExtensionHookInstructions(
  projectRoot: string,
  stepId: string,
  phase: 'before' | 'after',
): Promise<CollectHookInstructionsResult> {
  const { document, diagnostics: readDiagnostics } = await readSpecifyExtensionsDocument(projectRoot);
  if (document?.hooks == null) {
    return { instructions: [], diagnostics: readDiagnostics };
  }

  const event = `${phase}_${stepId}`;
  const entries = document.hooks[event] ?? [];
  const instructions: StepHookInstruction[] = [];
  const diagnostics = [...readDiagnostics];

  for (const entry of entries) {
    if (entry.enabled === false) {
      continue;
    }

    if (entry.condition != null && entry.condition.trim().length > 0) {
      diagnostics.push(`Skipped hook "${event}" because condition evaluation is deferred.`);
      continue;
    }

    if (entry.command == null || entry.command.trim().length === 0) {
      diagnostics.push(`Skipped hook "${event}" because command is missing.`);
      continue;
    }

    const normalizedCommand = normalizeHookCommand(entry.command);
    const optional = entry.optional ?? true;
    const available = await isSpecifyHookCommandAvailable(projectRoot, normalizedCommand);
    if (!available) {
      diagnostics.push(
        `Hook command "${normalizedCommand}" is not available; install the skill or fix the command reference.`,
      );
    }

    instructions.push({
      phase,
      command: normalizedCommand,
      description: entry.description ?? entry.command,
      optional,
      mandatory: !optional,
      available,
      prompt: entry.prompt,
      source: 'specify-extensions-yml',
      extension: entry.extension,
    });
  }

  return { instructions, diagnostics };
}

/**
 * Collects hook instructions from workflow extension manifests for one step phase.
 *
 * @param registry - Loaded extension registry for the project.
 * @param stepId - Workflow step id whose hooks should be collected.
 * @param phase - Lifecycle phase determining before or after hook events.
 * @returns Hook instructions and any non-blocking diagnostics.
 */
async function collectWorkflowExtensionHookInstructions(
  registry: ExtensionRegistry,
  projectRoot: string,
  stepId: string,
  phase: 'before' | 'after',
): Promise<CollectHookInstructionsResult> {
  const event = `${phase}_${stepId}`;
  const instructions: StepHookInstruction[] = [];
  const diagnostics: string[] = [];

  for (const extension of registry.extensions) {
    if (!extension.enabled) {
      continue;
    }

    for (const hook of extension.manifest.hooks ?? []) {
      if (hook.event !== event) {
        continue;
      }

      if (registry.skippedHooks.includes(hook.event)) {
        diagnostics.push(`Skipped extension hook "${hook.event}" because the step id is unknown.`);
        continue;
      }

      const optional = hook.optional ?? true;
      const available = await isWorkflowHookEntrypointAvailable(projectRoot, hook.entrypoint);
      if (!available) {
        diagnostics.push(
          `Extension hook "${hook.id}" entrypoint "${hook.entrypoint}" is not available.`,
        );
      }

      instructions.push({
        phase,
        command: hook.id,
        description: hook.description ?? `Extension hook ${hook.event}`,
        optional,
        mandatory: !optional,
        available,
        source: 'workflow-extension-manifest',
        extension: extension.id,
      });
    }
  }

  return { instructions, diagnostics };
}

/**
 * Merges hook instructions from `.specify/extensions.yml` and workflow extension manifests.
 *
 * @param input - Project root, step id, and lifecycle phase for hook collection.
 * @returns Combined hook instructions and non-blocking diagnostics.
 */
export async function collectHookInstructions(
  input: CollectHookInstructionsInput,
): Promise<CollectHookInstructionsResult> {
  const registry = await loadExtensionRegistry(input.projectRoot);
  const specifyHooks = await collectSpecifyExtensionHookInstructions(
    input.projectRoot,
    input.stepId,
    input.phase,
  );
  const manifestHooks = await collectWorkflowExtensionHookInstructions(
    registry,
    input.projectRoot,
    input.stepId,
    input.phase,
  );

  return {
    instructions: [...specifyHooks.instructions, ...manifestHooks.instructions],
    diagnostics: [...specifyHooks.diagnostics, ...manifestHooks.diagnostics],
  };
}

/**
 * Runs triage for the specify step, preferring an enabled extension handler when present.
 *
 * @param options - Triage input plus the project root used for extension resolution.
 * @returns Triage assessment from the active handler.
 */
export async function runTriageWithExtensions(
  options: TriageInput & { projectRoot: string },
): Promise<TriageAssessment> {
  const registry = await loadExtensionRegistry(options.projectRoot);
  const resolved = resolveActiveStepHandler(registry, 'triage');
  const enabledSetLists =
    options.enabledSetLists != null && options.enabledSetLists.length > 0
      ? options.enabledSetLists
      : await listSetLists(options.projectRoot, false);
  const triageInput: TriageInput = {
    description: options.description,
    defaultWorkflowId: options.defaultWorkflowId,
    availableWorkflowIds: options.availableWorkflowIds,
    enabledSetLists,
  };

  if (resolved.kind === 'built-in') {
    return assessTriage(triageInput);
  }

  const result = (await invokeExtensionHandler(options.projectRoot, resolved.entrypoint!, {
    projectRoot: options.projectRoot,
    stepId: 'triage',
    extensionId: resolved.extensionId,
    description: options.description,
    defaultWorkflowId: options.defaultWorkflowId,
    availableWorkflowIds: options.availableWorkflowIds,
    enabledSetLists,
  })) as TriageAssessment;

  return result;
}
