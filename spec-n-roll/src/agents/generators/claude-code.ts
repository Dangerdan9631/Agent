import type { ExtensionManifest } from '../../extensions/manifest.js';
import { mergeAgentMcpConfig, MCP_BINARY_RELATIVE_PATH } from '../mcp-config.js';
import { ensureAgentSkillsDirectory, writeRulesPointerFile } from './shared.js';
import type { BundledAgentGenerator } from './types.js';

/**
 * Bundled Claude Code agent extension manifest with MCP and rules targets.
 */
export const claudeCodeExtensionManifest: ExtensionManifest = {
  manifestVersion: '1',
  id: 'claude-code',
  name: 'Claude Code',
  description: 'Claude Code agent integration for spec-n-roll workflow commands and MCP tools.',
  targetToolkitVersion: '0.1.0',
  agentSetup: {
    mcpConfig: {
      serverId: 'spec-n-roll',
      format: 'claude-mcp-json',
      targets: [{ path: '.mcp.json' }],
    },
    ruleTargets: ['CLAUDE.md'],
    skillTargets: ['.agents/skills'],
  },
};

/**
 * Generates Claude Code pointer rules, skills directory, and MCP configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function generateClaudeCodeAgent(projectRoot: string): Promise<void> {
  await ensureAgentSkillsDirectory(projectRoot);
  await writeRulesPointerFile(projectRoot, 'CLAUDE.md', 'Claude Code Instructions');

  for (const target of claudeCodeExtensionManifest.agentSetup!.mcpConfig.targets) {
    await mergeAgentMcpConfig({
      projectRoot,
      targetPath: target.path,
      format: 'claude-mcp-json',
      serverId: claudeCodeExtensionManifest.agentSetup!.mcpConfig.serverId,
      mcpBinaryRelativePath: MCP_BINARY_RELATIVE_PATH,
    });
  }
}

/**
 * Bundled Claude Code agent generator registered during project initialization.
 */
export const claudeCodeGenerator: BundledAgentGenerator = {
  id: 'claude-code',
  manifest: claudeCodeExtensionManifest,
  generate: generateClaudeCodeAgent,
};
