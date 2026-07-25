/**
 * Supplies the bundled Cursor extension module installed for new projects.
 */
export class CursorAgentExtensionSource {
  /**
   * Returns the Cursor extension module source.
   *
   * @returns ECMAScript module text for the Cursor agent extension.
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
 * Installs Spec-N-Roll skills and MCP configuration for Cursor.
 */
export default class CursorAgentExtension {
  static defaultSkillMetadata = Object.freeze({
    author: 'spec-n-roll',
    version: '0.1.0',
  });

  /**
   * Creates Cursor-native skill files for the supplied skill configurations.
   *
   * @param skills - Ordered skill configurations to write.
   * @returns A promise that resolves after all skill files are written.
   */
  async createSkills(skills) {
    for (const skill of skills) {
      const skillPath = join(process.cwd(), '.cursor', 'skills', skill.identifier, 'SKILL.md');
      const content = [
        '---',
        \`name: \${JSON.stringify(skill.identifier)}\`,
        \`description: \${JSON.stringify(skill.purpose)}\`,
        'metadata:',
        \`  author: \${JSON.stringify(CursorAgentExtension.defaultSkillMetadata.author)}\`,
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
   * Upserts the project-local Spec-N-Roll MCP server in Cursor configuration.
   *
   * @returns A promise that resolves after the MCP configuration is written.
   */
  async configureMcp() {
    const configurationPath = join(process.cwd(), '.cursor', 'mcp.json');
    const configuration = await CursorAgentExtension.readMcpConfiguration(configurationPath);
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
   * Reads the existing Cursor MCP configuration or creates an empty server map.
   *
   * @param configurationPath - Absolute path to the Cursor MCP configuration file.
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

