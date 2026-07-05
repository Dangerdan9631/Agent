import path from 'node:path';
import fse from 'fs-extra';

import {
  bundledExtensionRelativeDir,
  getBundledAgentGenerator,
  installBundledExtensions,
  validateSelectedAgentIds,
} from './agents/extension-loader.js';
import { removeAgentMcpConfig, type McpConfigFormat } from './agents/mcp-config.js';
import type { AgentConfig, ExtensionRef, WorkflowConfig } from './config/schema.js';
import { atomicWriteJson } from './core/atomic-write.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from './init.js';
import { readWorkflowConfig } from './workflow/artifacts.js';

/**
 * Options controlling config agent add orchestration.
 */
export interface ConfigAgentAddOptions {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Agent ids to add; required.
   */
  agents: string[];
}

/**
 * Outcome for one agent processed by config agent add.
 */
export interface ConfigAgentAddAgentResult {
  /**
   * Agent id that was added or already configured.
   */
  agentId: string;
  /**
   * True when the agent was already present and no files were changed.
   */
  alreadyConfigured: boolean;
}

/**
 * Summary returned after adding agents to project configuration.
 */
export interface ConfigAgentAddResult {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Per-agent add outcomes in request order.
   */
  agents: ConfigAgentAddAgentResult[];
}

/**
 * Options controlling config agent remove orchestration.
 */
export interface ConfigAgentRemoveOptions {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Agent ids to remove; required.
   */
  agents: string[];
}

/**
 * Outcome for one agent processed by config agent remove.
 */
export interface ConfigAgentRemoveAgentResult {
  /**
   * Agent id that was removed or was not configured.
   */
  agentId: string;
  /**
   * True when the agent was not configured and no files were changed.
   */
  notConfigured: boolean;
}

/**
 * Summary returned after removing agents from project configuration.
 */
export interface ConfigAgentRemoveResult {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Per-agent remove outcomes in request order.
   */
  agents: ConfigAgentRemoveAgentResult[];
}

/**
 * Builds an agent config entry for a newly added agent.
 *
 * @param agentId - Agent id to add.
 * @returns Agent configuration entry for workflow.config.json.
 */
function buildAgentConfigEntry(agentId: string): AgentConfig {
  const generator = getBundledAgentGenerator(agentId);
  if (generator == null) {
    throw new Error(`Unknown agent id: ${agentId}`);
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
 * Builds an extension reference entry for a newly added agent.
 *
 * @param agentId - Agent id to add.
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
 * Deletes toolkit-owned rule pointer files declared for one agent.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param agentId - Bundled agent extension id being removed.
 */
async function removeAgentRulePointers(projectRoot: string, agentId: string): Promise<void> {
  const generator = getBundledAgentGenerator(agentId);
  const ruleTargets = generator?.manifest.agentSetup?.ruleTargets ?? [];

  for (const relativePath of ruleTargets) {
    const filePath = path.join(projectRoot, relativePath);
    if (await fse.pathExists(filePath)) {
      await fse.remove(filePath);
    }
  }
}

/**
 * Removes Spec-N-Roll MCP entries and extension artifacts for one agent.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param agentId - Bundled agent extension id being removed.
 */
async function removeAgentGeneratedFiles(projectRoot: string, agentId: string): Promise<void> {
  const generator = getBundledAgentGenerator(agentId);
  if (generator == null) {
    return;
  }

  const mcpConfig = generator.manifest.agentSetup?.mcpConfig;
  if (mcpConfig != null) {
    for (const target of mcpConfig.targets) {
      await removeAgentMcpConfig({
        projectRoot,
        targetPath: target.path,
        format: mcpConfig.format as McpConfigFormat,
        serverId: mcpConfig.serverId,
      });
    }
  }

  await removeAgentRulePointers(projectRoot, agentId);

  const extensionDir = path.join(projectRoot, bundledExtensionRelativeDir(agentId));
  if (await fse.pathExists(extensionDir)) {
    await fse.remove(extensionDir);
  }
}

/**
 * Adds agents to an initialized project without changing existing agents.
 *
 * @param options - Project path and agent selection.
 * @returns Summary of added or already-configured agents.
 */
export async function runConfigAgentAdd(
  options: ConfigAgentAddOptions,
): Promise<ConfigAgentAddResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const workflowConfig = await readWorkflowConfig(projectRoot);

  if (workflowConfig == null) {
    throw new Error(
      `Project is not initialized. Run \`spec-n-roll init\` before config agent add. Missing ${WORKFLOW_CONFIG_RELATIVE_PATH}.`,
    );
  }

  if (options.agents.length === 0) {
    throw new Error(
      'config agent add requires a comma-separated agent list argument (e.g. copilot,claude-code).',
    );
  }

  const agentsToAdd = validateSelectedAgentIds(options.agents);
  const configuredIds = new Set(workflowConfig.agents.map((agent) => agent.id));
  const results: ConfigAgentAddAgentResult[] = [];
  let updatedConfig: WorkflowConfig = workflowConfig;
  let configChanged = false;

  for (const agentToAdd of agentsToAdd) {
    if (configuredIds.has(agentToAdd)) {
      results.push({ agentId: agentToAdd, alreadyConfigured: true });
      continue;
    }

    const generator = getBundledAgentGenerator(agentToAdd);
    if (generator == null) {
      throw new Error(`Unknown agent id: ${agentToAdd}`);
    }

    await installBundledExtensions(projectRoot, [agentToAdd]);
    await generator.generate(projectRoot);
    configuredIds.add(agentToAdd);

    updatedConfig = {
      ...updatedConfig,
      agents: [...updatedConfig.agents, buildAgentConfigEntry(agentToAdd)],
      extensions: [...(updatedConfig.extensions ?? []), buildExtensionRef(agentToAdd)],
    };
    configChanged = true;
    results.push({ agentId: agentToAdd, alreadyConfigured: false });
  }

  if (configChanged) {
    await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), updatedConfig);
  }

  return {
    projectRoot,
    agents: results,
  };
}

/**
 * Removes agents from an initialized project without changing other agents.
 *
 * @param options - Project path and agent selection.
 * @returns Summary of removed or not-configured agents.
 */
export async function runConfigAgentRemove(
  options: ConfigAgentRemoveOptions,
): Promise<ConfigAgentRemoveResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const workflowConfig = await readWorkflowConfig(projectRoot);

  if (workflowConfig == null) {
    throw new Error(
      `Project is not initialized. Run \`spec-n-roll init\` before config agent remove. Missing ${WORKFLOW_CONFIG_RELATIVE_PATH}.`,
    );
  }

  if (options.agents.length === 0) {
    throw new Error(
      'config agent remove requires a comma-separated agent list argument (e.g. copilot,claude-code).',
    );
  }

  for (const agentId of options.agents) {
    if (getBundledAgentGenerator(agentId) == null) {
      throw new Error(`Unknown agent id: ${agentId}`);
    }
  }

  const agentsToRemove = options.agents;
  const configuredIds = new Set(workflowConfig.agents.map((agent) => agent.id));

  const results: ConfigAgentRemoveAgentResult[] = [];
  const removedIds = new Set<string>();
  let updatedConfig: WorkflowConfig = workflowConfig;
  let configChanged = false;

  for (const agentToRemove of agentsToRemove) {
    if (!configuredIds.has(agentToRemove)) {
      results.push({ agentId: agentToRemove, notConfigured: true });
      continue;
    }

    await removeAgentGeneratedFiles(projectRoot, agentToRemove);
    configuredIds.delete(agentToRemove);
    removedIds.add(agentToRemove);
    configChanged = true;
    results.push({ agentId: agentToRemove, notConfigured: false });
  }

  if (configChanged) {
    updatedConfig = {
      ...updatedConfig,
      agents: updatedConfig.agents.filter((agent) => !removedIds.has(agent.id)),
      extensions: (updatedConfig.extensions ?? []).filter(
        (extension) => !removedIds.has(extension.id),
      ),
    };
    await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), updatedConfig);
  }

  return {
    projectRoot,
    agents: results,
  };
}
