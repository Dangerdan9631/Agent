import type { ExtensionManifest } from '../../extensions/manifest.js';
import { mergeAgentMcpConfig, MCP_BINARY_RELATIVE_PATH } from '../mcp-config.js';
import { ensureAgentSkillsDirectory, writeRulesPointerFile } from './shared.js';
import type { BundledAgentGenerator } from './types.js';

/**
 * Bundled GitHub Copilot agent extension manifest with MCP and rules targets.
 */
export const copilotExtensionManifest: ExtensionManifest = {
  manifestVersion: '1',
  id: 'copilot',
  name: 'GitHub Copilot',
  description: 'GitHub Copilot agent integration for Spec-N-Roll workflow commands and MCP tools.',
  targetToolkitVersion: '0.1.0',
  agentSetup: {
    mcpConfig: {
      serverId: 'spec-n-roll',
      format: 'copilot-mcp-json',
      targets: [{ path: '.vscode/mcp.json' }],
    },
    ruleTargets: ['.github/copilot-instructions.md'],
    skillTargets: ['.agents/skills'],
  },
};

/**
 * Generates Copilot pointer rules, skills directory, and MCP configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function generateCopilotAgent(projectRoot: string): Promise<void> {
  await ensureAgentSkillsDirectory(projectRoot);
  await writeRulesPointerFile(
    projectRoot,
    '.github/copilot-instructions.md',
    'GitHub Copilot Instructions',
  );

  for (const target of copilotExtensionManifest.agentSetup!.mcpConfig.targets) {
    await mergeAgentMcpConfig({
      projectRoot,
      targetPath: target.path,
      format: 'copilot-mcp-json',
      serverId: copilotExtensionManifest.agentSetup!.mcpConfig.serverId,
      mcpBinaryRelativePath: MCP_BINARY_RELATIVE_PATH,
    });
  }
}

/**
 * Bundled GitHub Copilot agent generator registered during project initialization.
 */
export const copilotGenerator: BundledAgentGenerator = {
  id: 'copilot',
  manifest: copilotExtensionManifest,
  generate: generateCopilotAgent,
};
