/**
 * Supplies the bundled Codex extension module installed for new projects.
 */
export class CodexAgentExtensionSource {
  /**
   * Returns the Codex extension module source.
   *
   * @returns ECMAScript module text for the Codex agent extension.
   */
  source(): string {
    return `/*
---
metadata:
  author: 'spec-n-roll'
  version: '0.1.0'
---
*/
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Installs Spec-N-Roll skills and MCP configuration for Codex.
 */
export default class CodexAgentExtension {
  static defaultSkillMetadata = Object.freeze({
    author: 'spec-n-roll',
    version: '0.1.0',
  });

  /**
   * Creates Codex-native skill files for the supplied skill configurations.
   *
   * @param skills - Ordered skill configurations to write.
   * @returns A promise that resolves after all skill files are written.
   */
  async createSkills(skills) {
    for (const skill of skills) {
      const skillPath = join(process.cwd(), '.codex', 'skills', skill.identifier, 'SKILL.md');
      const content = [
        '---',
        \`name: \${JSON.stringify(skill.identifier)}\`,
        \`description: \${JSON.stringify(skill.purpose)}\`,
        'metadata:',
        \`  author: \${JSON.stringify(CodexAgentExtension.defaultSkillMetadata.author)}\`,
        \`  version: \${JSON.stringify(skill.version)}\`,
        '---',
        '',
        skill.source,
        '',
      ].join('\\n');
      await mkdir(dirname(skillPath), { recursive: true });
      await writeFile(skillPath, content, 'utf8');
    }
  }

  /**
   * Upserts the project-local Spec-N-Roll MCP server in Codex configuration.
   *
   * @returns A promise that resolves after the MCP configuration is written.
   */
  async configureMcp() {
    const configurationPath = join(process.cwd(), '.codex', 'mcp.json');
    const configuration = await CodexAgentExtension.readMcpConfiguration(configurationPath);
    await mkdir(dirname(configurationPath), { recursive: true });
    await writeFile(
      configurationPath,
      \`\${JSON.stringify({
        ...configuration,
        mcpServers: {
          ...configuration.mcpServers,
          'spec-n-roll': {
            command: 'node',
            args: ['./.spec-n-roll/cli/bin/spec-n-roll-mcp.js'],
          },
        },
      }, null, 2)}\\n\`,
      'utf8',
    );
  }

  /**
   * Reads the existing Codex MCP configuration or creates an empty server map.
   *
   * @param configurationPath - Absolute path to the Codex MCP configuration file.
   * @returns Parsed configuration with an MCP server map.
   */
  static async readMcpConfiguration(configurationPath) {
    try {
      const configuration = JSON.parse(await readFile(configurationPath, 'utf8'));
      return {
        ...configuration,
        mcpServers: configuration.mcpServers ?? {},
      };
    } catch (error) {
      if (error && error.code === 'ENOENT') return { mcpServers: {} };
      throw error;
    }
  }
}
`;
  }
}

