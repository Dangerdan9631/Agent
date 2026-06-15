import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { injectAll, injectable } from 'tsyringe';

import { MCP_TOOL } from '../di/tokens.js';
import type { McpTool } from './mcp-tool.js';

/**
 * Reads the toolkit version from package.json for MCP server identification.
 *
 * @returns Semver version string for the installed toolkit package.
 */
function readToolkitVersion(): string {
  const packageJsonPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../package.json',
  );
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
}

/**
 * Creates MCP server instances from injected tool registrar classes.
 */
@injectable()
export class McpServerFactory {
  /**
   * Creates a factory with all registered MCP tool groups.
   *
   * @param tools - Tool groups registered in the application container.
   */
  constructor(@injectAll(MCP_TOOL) private readonly tools: McpTool[]) {}

  /**
   * Creates the MCP server with all injected tools registered.
   *
   * @returns Configured MCP server ready for stdio transport.
   */
  createServer(): McpServer {
    const server = new McpServer({
      name: 'spec-n-roll',
      version: readToolkitVersion(),
    });

    for (const tool of this.tools) {
      tool.register(server);
    }

    return server;
  }
}
