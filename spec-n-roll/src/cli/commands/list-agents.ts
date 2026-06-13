import path from 'node:path';
import { Command } from 'commander';

import { listBundledAgents, type BundledAgentSummary } from '../../agents/extension-loader.js';
import { readWorkflowConfig } from '../../workflow/artifacts.js';

/**
 * Options controlling which agents are listed.
 */
export interface ListAgentsOptions {
  /**
   * When true, list only agents installed and enabled in the project workflow config.
   */
  enabledOnly?: boolean;
  /**
   * Absolute path to the project root used when resolving enabled agents.
   */
  projectRoot: string;
}

/**
 * Formats agent summaries as aligned id and display name lines with column headers.
 *
 * @param agents - Bundled agent summaries to format.
 * @returns Multi-line text with a header row followed by one agent per line.
 */
export function formatBundledAgentsList(agents: readonly BundledAgentSummary[]): string {
  const idWidth = Math.max('id'.length, ...agents.map((agent) => agent.id.length));
  const header = `${'id'.padEnd(idWidth)}  name`;
  const rows = agents.map((agent) => `${agent.id.padEnd(idWidth)}  ${agent.name}`);
  return [header, ...rows].join('\n');
}

/**
 * Registers the `list agents` subcommand on the list command group.
 *
 * @param list - Commander `list` command to attach the subcommand to.
 */
export function registerListAgentsCommand(list: Command): void {
  list
    .command('agents')
    .description('List all available agents')
    .option('--enabled', 'List only agents installed and enabled in this project')
    .action(async (commandOptions: { enabled?: boolean }) => {
      await handleListAgentsCommand(commandOptions);
    });
}

/**
 * Resolves agent summaries to list for the current options.
 *
 * @param options - Listing mode and project root for enabled-agent lookup.
 * @returns Agent id and display name pairs in stable id order.
 */
export async function resolveListedAgents(
  options: ListAgentsOptions,
): Promise<BundledAgentSummary[]> {
  const bundledAgents = listBundledAgents();

  if (options.enabledOnly !== true) {
    return bundledAgents;
  }

  const workflowConfig = await readWorkflowConfig(path.resolve(options.projectRoot));
  if (workflowConfig == null) {
    return [];
  }

  const enabledIds = new Set(
    workflowConfig.agents.filter((agent) => agent.enabled).map((agent) => agent.id),
  );

  return bundledAgents.filter((agent) => enabledIds.has(agent.id));
}

/**
 * Commander action handler for `spec-n-roll list agents`.
 *
 * @param commandOptions - Parsed Commander options including `enabled`.
 */
export async function handleListAgentsCommand(
  commandOptions: { enabled?: boolean } = {},
): Promise<void> {
  const agents = await resolveListedAgents({
    enabledOnly: commandOptions.enabled === true,
    projectRoot: process.cwd(),
  });
  console.log(formatBundledAgentsList(agents));
}
