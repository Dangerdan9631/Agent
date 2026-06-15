import type { ExtensionManifest } from '../../extensions/manifest.js';
import { mergeAgentMcpConfig, MCP_BINARY_RELATIVE_PATH } from '../mcp-config.js';
import { ensureAgentSkillsDirectory, writeCursorRulesPointer } from './shared.js';
import type { BundledAgentGenerator } from './types.js';

/**
 * Bundled Cursor agent extension manifest with MCP and rules targets.
 */
export const cursorExtensionManifest: ExtensionManifest = {
  manifestVersion: '1',
  id: 'cursor',
  name: 'Cursor',
  description: 'Cursor agent integration for Spec-N-Roll workflow commands and MCP tools.',
  targetToolkitVersion: '0.1.0',
  agentSetup: {
    mcpConfig: {
      serverId: 'spec-n-roll',
      format: 'cursor-mcp-json',
      targets: [{ path: '.cursor/mcp.json' }],
    },
    ruleTargets: ['.cursor/rules/spec-n-roll.mdc'],
    skillTargets: ['.agents/skills'],
  },
};

/**
 * Generates Cursor pointer rules, skills directory, and MCP configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function generateCursorAgent(projectRoot: string): Promise<void> {
  await ensureAgentSkillsDirectory(projectRoot);
  await writeCursorRulesPointer(projectRoot, '.cursor/rules/spec-n-roll.mdc');

  for (const target of cursorExtensionManifest.agentSetup!.mcpConfig.targets) {
    await mergeAgentMcpConfig({
      projectRoot,
      targetPath: target.path,
      format: 'cursor-mcp-json',
      serverId: cursorExtensionManifest.agentSetup!.mcpConfig.serverId,
      mcpBinaryRelativePath: MCP_BINARY_RELATIVE_PATH,
    });
  }
}

/**
 * Bundled Cursor agent generator registered during project initialization.
 */
export const cursorGenerator: BundledAgentGenerator = {
  id: 'cursor',
  manifest: cursorExtensionManifest,
  generate: generateCursorAgent,
};
