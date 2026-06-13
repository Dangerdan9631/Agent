import type { ExtensionManifest } from '../../extensions/manifest.js';
import { mergeAgentMcpConfig, MCP_BINARY_RELATIVE_PATH } from '../mcp-config.js';
import { ensureAgentSkillsDirectory, writeRulesPointerFile } from './shared.js';
import type { BundledAgentGenerator } from './types.js';

/**
 * Bundled Codex agent extension manifest with MCP and rules targets.
 */
export const codexExtensionManifest: ExtensionManifest = {
  manifestVersion: '1',
  id: 'codex',
  name: 'Codex',
  description: 'Codex agent integration for Spec-N-Roll workflow commands and MCP tools.',
  targetToolkitVersion: '0.1.0',
  agentSetup: {
    mcpConfig: {
      serverId: 'spec-n-roll',
      format: 'codex-mcp-json',
      targets: [{ path: '.codex/mcp.json' }],
    },
    ruleTargets: ['AGENTS.md'],
    skillTargets: ['.agents/skills'],
  },
};

/**
 * Generates Codex pointer rules, skills directory, and MCP configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function generateCodexAgent(projectRoot: string): Promise<void> {
  await ensureAgentSkillsDirectory(projectRoot);
  await writeRulesPointerFile(projectRoot, 'AGENTS.md', 'Codex Agent Rules');

  for (const target of codexExtensionManifest.agentSetup!.mcpConfig.targets) {
    await mergeAgentMcpConfig({
      projectRoot,
      targetPath: target.path,
      format: 'codex-mcp-json',
      serverId: codexExtensionManifest.agentSetup!.mcpConfig.serverId,
      mcpBinaryRelativePath: MCP_BINARY_RELATIVE_PATH,
    });
  }
}

/**
 * Bundled Codex agent generator registered during project initialization.
 */
export const codexGenerator: BundledAgentGenerator = {
  id: 'codex',
  manifest: codexExtensionManifest,
  generate: generateCodexAgent,
};
