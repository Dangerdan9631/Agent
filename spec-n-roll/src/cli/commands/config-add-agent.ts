import path from 'node:path';

import {
  bundledExtensionRelativeDir,
  getBundledAgentGenerator,
  installBundledExtensions,
  listBundledAgentIds,
  validateSelectedAgentIds,
} from '../../agents/extension-loader.js';
import type { AgentConfig, ExtensionRef, WorkflowConfig } from '../../config/schema.js';
import { atomicWriteJson } from '../../core/atomic-write.js';
import { readWorkflowConfig, WORKFLOW_CONFIG_RELATIVE_PATH } from '../../workflow/artifacts.js';
import { promptForAgentToAdd } from '../ink/add-agent-prompt.js';

/**
 * Options controlling config add-agent orchestration.
 */
export interface ConfigAddAgentOptions {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Bundled agent id to add; required when `yes` is true.
   */
  agent?: string;
  /**
   * When true, skip Ink prompts and require explicit `agent`.
   */
  yes?: boolean;
}

/**
 * Summary returned after adding an agent to project configuration.
 */
export interface ConfigAddAgentResult {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Agent id that was added or already configured.
   */
  addedAgent: string;
  /**
   * True when the agent was already present and no files were changed.
   */
  alreadyConfigured: boolean;
}

/**
 * Parses a single agent id from CLI flags.
 *
 * @param agentFlag - Bundled agent id from `--agent`.
 * @returns Trimmed agent id or empty string when absent.
 */
export function parseAgentFlag(agentFlag: string | undefined): string {
  return agentFlag?.trim() ?? '';
}

/**
 * Returns bundled agent ids that are not yet configured in the project.
 *
 * @param workflowConfig - Current workflow configuration.
 * @returns Agent ids available for add-agent selection.
 */
function listUnconfiguredAgentIds(workflowConfig: WorkflowConfig): string[] {
  const configured = new Set(workflowConfig.agents.map((agent) => agent.id));
  return listBundledAgentIds().filter((agentId) => !configured.has(agentId));
}

/**
 * Builds an agent config entry for a newly added bundled agent.
 *
 * @param agentId - Bundled agent id to add.
 * @returns Agent configuration entry for workflow.config.json.
 */
function buildAgentConfigEntry(agentId: string): AgentConfig {
  const generator = getBundledAgentGenerator(agentId);
  if (generator == null) {
    throw new Error(`Unknown bundled agent id: ${agentId}`);
  }

  return {
    id: agentId,
    displayName: generator.manifest.name,
    enabled: true,
    commandPrefix: 'spec-n-',
    ruleTargets: generator.manifest.agentSetup?.ruleTargets,
    skillTargets: generator.manifest.agentSetup?.skillTargets,
  };
}

/**
 * Builds an extension reference entry for a newly added bundled agent.
 *
 * @param agentId - Bundled agent id to add.
 * @returns Extension reference for workflow.config.json.
 */
function buildExtensionRef(agentId: string): ExtensionRef {
  return {
    id: agentId,
    manifestPath: path.posix.join(bundledExtensionRelativeDir(agentId), 'manifest.json'),
    enabled: true,
  };
}

/**
 * Resolves the agent id to add from options or interactive prompts.
 *
 * @param options - Add-agent options including `yes` and `agent`.
 * @param availableAgentIds - Bundled agent ids not yet configured.
 * @returns Validated bundled agent id to add.
 */
async function resolveAgentToAdd(
  options: ConfigAddAgentOptions,
  availableAgentIds: string[],
): Promise<string> {
  if (options.yes === true) {
    const agentId = parseAgentFlag(options.agent);
    if (agentId.length === 0) {
      throw new Error('Non-interactive config add-agent requires --agent with a bundled agent id.');
    }
    return validateSelectedAgentIds([agentId])[0]!;
  }

  if (options.agent != null && options.agent.trim().length > 0) {
    return validateSelectedAgentIds([options.agent.trim()])[0]!;
  }

  if (availableAgentIds.length === 0) {
    throw new Error('All bundled agents are already configured for this project.');
  }

  return promptForAgentToAdd(availableAgentIds);
}

/**
 * Adds a bundled agent to an initialized project without changing existing agents.
 *
 * @param options - Project path, agent selection, and non-interactive options.
 * @returns Summary of the added or already-configured agent.
 */
export async function runConfigAddAgent(
  options: ConfigAddAgentOptions,
): Promise<ConfigAddAgentResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const workflowConfig = await readWorkflowConfig(projectRoot);

  if (workflowConfig == null) {
    throw new Error(
      `Project is not initialized. Run \`spec-n-roll init\` before config add-agent. Missing ${WORKFLOW_CONFIG_RELATIVE_PATH}.`,
    );
  }

  const configuredIds = new Set(workflowConfig.agents.map((agent) => agent.id));
  const availableAgentIds = listUnconfiguredAgentIds(workflowConfig);
  const agentToAdd = await resolveAgentToAdd(options, availableAgentIds);

  if (configuredIds.has(agentToAdd)) {
    return {
      projectRoot,
      addedAgent: agentToAdd,
      alreadyConfigured: true,
    };
  }

  const generator = getBundledAgentGenerator(agentToAdd);
  if (generator == null) {
    throw new Error(`Unknown bundled agent id: ${agentToAdd}`);
  }

  await installBundledExtensions(projectRoot, [agentToAdd]);
  await generator.generate(projectRoot);

  const updatedConfig: WorkflowConfig = {
    ...workflowConfig,
    agents: [...workflowConfig.agents, buildAgentConfigEntry(agentToAdd)],
    extensions: [
      ...(workflowConfig.extensions ?? []),
      buildExtensionRef(agentToAdd),
    ],
  };

  await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), updatedConfig);

  return {
    projectRoot,
    addedAgent: agentToAdd,
    alreadyConfigured: false,
  };
}

/**
 * Commander action handler for `spec-n-roll config add-agent`.
 *
 * @param commandOptions - Parsed Commander options including `yes` and `agent`.
 */
export async function handleConfigAddAgentCommand(commandOptions: {
  yes?: boolean;
  agent?: string;
}): Promise<void> {
  try {
    const result = await runConfigAddAgent({
      projectRoot: process.cwd(),
      yes: commandOptions.yes === true,
      agent: parseAgentFlag(commandOptions.agent) || undefined,
    });

    if (result.alreadyConfigured) {
      console.log(`Agent already configured: ${result.addedAgent}`);
      return;
    }

    console.log(`Added agent: ${result.addedAgent}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`config add-agent failed: ${message}`);
    process.exitCode = 1;
  }
}
