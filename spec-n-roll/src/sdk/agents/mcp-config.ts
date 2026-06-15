import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteJson } from '../core/atomic-write.js';
import type { ExtensionManifest } from '../extensions/manifest.js';

/**
 * Project-relative path to the project-local MCP server binary.
 */
export const MCP_BINARY_RELATIVE_PATH = path.posix.join(
  '.spec-n-roll',
  'cli',
  'bin',
  'spec-n-roll-mcp',
);

/**
 * Project-relative path to the Windows MCP server wrapper.
 */
export const MCP_BINARY_CMD_RELATIVE_PATH = `${MCP_BINARY_RELATIVE_PATH}.cmd`;

/**
 * Supported MCP configuration format adapter identifiers.
 */
export type McpConfigFormat =
  | 'cursor-mcp-json'
  | 'claude-mcp-json'
  | 'copilot-mcp-json'
  | 'codex-mcp-json';

/**
 * Options for idempotent MCP configuration merge into an agent target file.
 */
export interface MergeAgentMcpConfigOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Project-relative path to the agent MCP configuration file.
   */
  targetPath: string;
  /**
   * Format adapter id declared in the extension manifest.
   */
  format: McpConfigFormat;
  /**
   * Stable merge key for the Spec-N-Roll MCP server entry.
   */
  serverId: string;
  /**
   * Project-relative path to the MCP binary used in the server command.
   */
  mcpBinaryRelativePath: string;
}

/**
 * Cursor-style MCP JSON document with a top-level mcpServers map.
 */
interface McpServersDocument {
  mcpServers: Record<string, McpServerEntry>;
}

/**
 * One MCP server entry using stdio command invocation.
 */
interface McpServerEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Returns the stdio MCP server entry for the local Spec-N-Roll binary.
 *
 * @param mcpBinaryRelativePath - Project-relative MCP binary path.
 * @returns Server entry suitable for agent MCP JSON formats.
 */
export function buildSpecNRollMcpServerEntry(mcpBinaryRelativePath: string): McpServerEntry {
  return {
    command: 'node',
    args: [mcpBinaryRelativePath],
  };
}

/**
 * Reads an MCP config document or returns an empty servers map when absent.
 *
 * @param filePath - Absolute path to the MCP config file.
 * @param format - Format adapter id controlling parse expectations.
 * @returns Parsed MCP servers document.
 */
async function readMcpConfigDocument(
  filePath: string,
  format: McpConfigFormat,
): Promise<McpServersDocument> {
  if (!(await fse.pathExists(filePath))) {
    return { mcpServers: {} };
  }

  let raw: unknown;
  try {
    raw = await fse.readJson(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot parse MCP config at ${filePath}: ${message}. Fix the file manually or delete it and re-run init.`,
    );
  }

  if (raw == null || typeof raw !== 'object') {
    throw new Error(
      `MCP config at ${filePath} is not a JSON object. Fix the file manually or delete it and re-run init.`,
    );
  }

  const record = raw as Record<string, unknown>;
  if (!('mcpServers' in record) || record.mcpServers == null) {
    if (format === 'cursor-mcp-json' || format === 'claude-mcp-json') {
      return { mcpServers: {} };
    }
    throw new Error(
      `MCP config at ${filePath} is missing mcpServers. Fix the file manually or delete it and re-run init.`,
    );
  }

  if (typeof record.mcpServers !== 'object' || Array.isArray(record.mcpServers)) {
    throw new Error(
      `MCP config at ${filePath} has an invalid mcpServers value. Fix the file manually or delete it and re-run init.`,
    );
  }

  return {
    mcpServers: record.mcpServers as Record<string, McpServerEntry>,
    ...(record as object),
  } as McpServersDocument;
}

/**
 * Upserts the Spec-N-Roll MCP server entry without removing unrelated servers.
 *
 * @param document - Existing MCP config document to mutate.
 * @param serverId - Stable merge key for the Spec-N-Roll entry.
 * @param mcpBinaryRelativePath - Project-relative MCP binary path.
 * @returns Updated MCP config document.
 */
export function upsertSpecNRollMcpServer(
  document: McpServersDocument,
  serverId: string,
  mcpBinaryRelativePath: string,
): McpServersDocument {
  return {
    ...document,
    mcpServers: {
      ...document.mcpServers,
      [serverId]: buildSpecNRollMcpServerEntry(mcpBinaryRelativePath),
    },
  };
}

/**
 * Creates or merges the Spec-N-Roll MCP server entry in an agent config file.
 *
 * @param options - Merge target, format, and server identity options.
 */
export async function mergeAgentMcpConfig(options: MergeAgentMcpConfigOptions): Promise<void> {
  const filePath = path.join(options.projectRoot, options.targetPath);
  const existing = await readMcpConfigDocument(filePath, options.format);
  const merged = upsertSpecNRollMcpServer(
    existing,
    options.serverId,
    options.mcpBinaryRelativePath,
  );
  await atomicWriteJson(filePath, merged);
}

/**
 * Options for removing the Spec-N-Roll MCP server entry from an agent target file.
 */
export interface RemoveAgentMcpConfigOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Project-relative path to the agent MCP configuration file.
   */
  targetPath: string;
  /**
   * Format adapter id declared in the extension manifest.
   */
  format: McpConfigFormat;
  /**
   * Stable merge key for the Spec-N-Roll MCP server entry.
   */
  serverId: string;
}

/**
 * Removes the Spec-N-Roll MCP server entry without deleting unrelated servers.
 *
 * @param document - Existing MCP config document to mutate.
 * @param serverId - Stable merge key for the Spec-N-Roll entry.
 * @returns Updated document, or null when the entry was already absent.
 */
export function removeSpecNRollMcpServer(
  document: McpServersDocument,
  serverId: string,
): McpServersDocument | null {
  if (!(serverId in document.mcpServers)) {
    return null;
  }

  const { [serverId]: _removed, ...remainingServers } = document.mcpServers;
  return {
    ...document,
    mcpServers: remainingServers,
  };
}

/**
 * Removes the Spec-N-Roll MCP server entry from an agent config file.
 *
 * @param options - Target path, format, and server identity options.
 */
export async function removeAgentMcpConfig(options: RemoveAgentMcpConfigOptions): Promise<void> {
  const filePath = path.join(options.projectRoot, options.targetPath);
  if (!(await fse.pathExists(filePath))) {
    return;
  }

  const existing = await readMcpConfigDocument(filePath, options.format);
  const updated = removeSpecNRollMcpServer(existing, options.serverId);
  if (updated == null) {
    return;
  }

  if (Object.keys(updated.mcpServers).length === 0) {
    const otherTopLevelKeys = Object.keys(updated).filter((key) => key !== 'mcpServers');
    if (otherTopLevelKeys.length === 0) {
      await fse.remove(filePath);
      return;
    }
  }

  await atomicWriteJson(filePath, updated);
}

/**
 * Outcome of refreshing one agent MCP configuration target during update.
 */
export interface McpConfigRefreshResult {
  /**
   * Bundled agent extension id whose MCP config was refreshed.
   */
  agentId: string;
  /**
   * Project-relative MCP configuration file path that was updated.
   */
  targetPath: string;
  /**
   * True when the Spec-N-Roll MCP server entry was upserted successfully.
   */
  refreshed: boolean;
  /**
   * Error message when refresh failed for this target.
   */
  error?: string;
}

/**
 * Refreshes the Spec-N-Roll MCP server entry for one agent extension.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param agentId - Bundled agent extension id to refresh.
 * @param manifest - Validated extension manifest containing MCP config targets.
 * @returns Refresh results for each configured MCP target path.
 */
export async function refreshAgentMcpConfigFromManifest(
  projectRoot: string,
  agentId: string,
  manifest: Pick<ExtensionManifest, 'agentSetup'>,
): Promise<McpConfigRefreshResult[]> {
  const mcpConfig = manifest.agentSetup?.mcpConfig;
  if (mcpConfig == null) {
    return [
      {
        agentId,
        targetPath: '',
        refreshed: false,
        error: `Agent ${agentId} has no agentSetup.mcpConfig in its manifest.`,
      },
    ];
  }

  const results: McpConfigRefreshResult[] = [];

  for (const target of mcpConfig.targets) {
    try {
      await mergeAgentMcpConfig({
        projectRoot,
        targetPath: target.path,
        format: mcpConfig.format as McpConfigFormat,
        serverId: mcpConfig.serverId,
        mcpBinaryRelativePath: MCP_BINARY_RELATIVE_PATH,
      });
      results.push({
        agentId,
        targetPath: target.path,
        refreshed: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        agentId,
        targetPath: target.path,
        refreshed: false,
        error: message,
      });
    }
  }

  return results;
}

/**
 * Refreshes Spec-N-Roll MCP server paths for all configured agent extensions.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param agentIds - Enabled agent ids from workflow configuration.
 * @param loadManifest - Loads a validated manifest for the given agent id.
 * @returns Combined refresh results across all agents and MCP targets.
 */
export async function refreshConfiguredAgentMcpConfigs(
  projectRoot: string,
  agentIds: readonly string[],
  loadManifest: (agentId: string) => Promise<Pick<ExtensionManifest, 'agentSetup'>>,
): Promise<McpConfigRefreshResult[]> {
  const results: McpConfigRefreshResult[] = [];

  for (const agentId of agentIds) {
    try {
      const manifest = await loadManifest(agentId);
      const agentResults = await refreshAgentMcpConfigFromManifest(projectRoot, agentId, manifest);
      results.push(...agentResults);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        agentId,
        targetPath: '',
        refreshed: false,
        error: message,
      });
    }
  }

  return results;
}
