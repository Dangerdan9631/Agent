import path from 'node:path';
import { Command } from 'commander';
import fse from 'fs-extra';

import {
  bundledExtensionRelativeDir,
  getBundledAgentGenerator,
} from '../../agents/extension-loader.js';
import { removeAgentMcpConfig, type McpConfigFormat } from '../../agents/mcp-config.js';
import type { WorkflowConfig } from '../../config/schema.js';
import { atomicWriteJson } from '../../core/atomic-write.js';
import { readWorkflowConfig, WORKFLOW_CONFIG_RELATIVE_PATH } from '../../workflow/artifacts.js';
import { parseCommaSeparatedAgentList } from './core-cli-utils.js';

/**
 * Options controlling config agent remove orchestration.
 */
export interface ConfigAgentRemoveOptions {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Agent ids to remove; required on the CLI.
   */
  agents?: string[];
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
 * Resolves agent ids to remove from CLI options.
 *
 * @param options - Remove-agent options including `agents`.
 * @returns Validated bundled agent ids to remove.
 */
function resolveAgentsToRemove(options: ConfigAgentRemoveOptions): string[] {
  const agentIds = options.agents ?? [];
  if (agentIds.length === 0) {
    throw new Error(
      'config agent remove requires a comma-separated agent list argument (e.g. copilot,claude-code).',
    );
  }

  for (const agentId of agentIds) {
    if (getBundledAgentGenerator(agentId) == null) {
      throw new Error(`Unknown agent id: ${agentId}`);
    }
  }

  return agentIds;
}

/**
 * Deletes toolkit-owned rule pointer files declared for one bundled agent.
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
 * Removes bundled agents from an initialized project without changing other agents.
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

  const agentsToRemove = resolveAgentsToRemove(options);
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

/**
 * Registers the `config agent remove` subcommand on the config agent command group.
 *
 * @param agent - Commander `config agent` command to attach the subcommand to.
 */
export function registerConfigAgentRemoveCommand(agent: Command): void {
  agent
    .command('remove <agents>')
    .description('Remove agents from the project configuration')
    .action(async (agents: string) => {
      await handleConfigAgentRemoveCommand(agents);
    });
}

/**
 * Commander action handler for `spec-n-roll config agent remove`.
 *
 * @param agentsArg - Comma-separated agent ids from the positional argument.
 */
export async function handleConfigAgentRemoveCommand(agentsArg: string): Promise<void> {
  try {
    const result = await runConfigAgentRemove({
      projectRoot: process.cwd(),
      agents: parseCommaSeparatedAgentList(agentsArg),
    });

    for (const agent of result.agents) {
      if (agent.notConfigured) {
        console.log(`Agent not configured: ${agent.agentId}`);
      } else {
        console.log(`Removed agent: ${agent.agentId}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`config agent remove failed: ${message}`);
    process.exitCode = 1;
  }
}
