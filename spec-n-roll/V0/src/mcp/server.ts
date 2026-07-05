#!/usr/bin/env node

import '../di/bootstrap.js';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { rootContainer } from '../di/container.js';
import { isCurrentModuleEntrypoint } from '../sdk/core/paths.js';
import { McpServerFactory } from './server-factory.js';

/**
 * Creates the MCP server with all core-library tools registered (SC-012).
 *
 * @returns Configured MCP server ready for stdio transport.
 */
export function createMcpServer(): McpServer {
  return rootContainer.resolve(McpServerFactory).createServer();
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
