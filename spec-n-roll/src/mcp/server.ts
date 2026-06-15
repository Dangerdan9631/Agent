#!/usr/bin/env node

import '../di/bootstrap.js';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { isCurrentModuleEntrypoint } from '../sdk/core/paths.js';
import { registerCoreMcpTools } from './tools.js';

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
 * Creates the MCP server with all core-library tools registered (SC-012).
 *
 * @returns Configured MCP server ready for stdio transport.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'spec-n-roll',
    version: readToolkitVersion(),
  });

  registerCoreMcpTools(server);
  return server;
}

/**
 * Starts the MCP server on stdio transport for agent integration.
 */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Entry point for the project-local MCP server binary.
 */
export async function main(): Promise<void> {
  await startMcpServer();
}

const isMainModule = isCurrentModuleEntrypoint(process.argv[1], import.meta.url, [
  'server.js',
  'server.ts',
]);

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
