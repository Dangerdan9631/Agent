import path from 'node:path';
import { Command } from 'commander';

import {
  bundledExtensionRelativeDir,
  getBundledAgentGenerator,
  installBundledExtensions,
  validateSelectedAgentIds,
} from '../../agents/extension-loader.js';
import type { AgentConfig, ExtensionRef, WorkflowConfig } from '../../config/schema.js';
import { atomicWriteJson } from '../../core/atomic-write.js';
import { readWorkflowConfig, WORKFLOW_CONFIG_RELATIVE_PATH } from '../../workflow/artifacts.js';
import { parseCommaSeparatedAgentList } from './core-cli-utils.js';

/**
 * Options controlling config agent add orchestration.
 */
export interface ConfigAgentAddOptions {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Agent ids to add; required on the CLI.
   */
  agents?: string[];
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
 * Builds an agent config entry for a newly added bundled agent.
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
 * Builds an extension reference entry for a newly added bundled agent.
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
 * Resolves agent ids to add from CLI options.
 *
 * @param options - Add-agent options including `agents`.
 * @returns Validated agent ids to add.
 */
function resolveAgentsToAdd(options: ConfigAgentAddOptions): string[] {
  const agentIds = options.agents ?? [];
  if (agentIds.length === 0) {
    throw new Error(
      'config agent add requires a comma-separated agent list argument (e.g. copilot,claude-code).',
    );
  }
  return validateSelectedAgentIds(agentIds);
}

/**
 * Adds bundled agents to an initialized project without changing existing agents.
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

  const configuredIds = new Set(workflowConfig.agents.map((agent) => agent.id));
  const agentsToAdd = resolveAgentsToAdd(options);
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
 * Registers the `config agent add` subcommand on the config agent command group.
 *
 * @param agent - Commander `config agent` command to attach the subcommand to.
 */
export function registerConfigAgentAddCommand(agent: Command): void {
  agent
    .command('add <agents>')
    .description('Add agents to the project configuration')
    .action(async (agents: string) => {
      await handleConfigAgentAddCommand(agents);
    });
}

/**
 * Commander action handler for `spec-n-roll config agent add`.
 *
 * @param agentsArg - Comma-separated agent ids from the positional argument.
 */
export async function handleConfigAgentAddCommand(agentsArg: string): Promise<void> {
  try {
    const result = await runConfigAgentAdd({
      projectRoot: process.cwd(),
      agents: parseCommaSeparatedAgentList(agentsArg),
    });

    for (const agent of result.agents) {
      if (agent.alreadyConfigured) {
        console.log(`Agent already configured: ${agent.agentId}`);
      } else {
        console.log(`Added agent: ${agent.agentId}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`config agent add failed: ${message}`);
    process.exitCode = 1;
  }
}
