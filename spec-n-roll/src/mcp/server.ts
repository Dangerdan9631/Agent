#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Toolkit version read from the package manifest for MCP server identification.
 */
const TOOLKIT_VERSION = '0.1.0';

/**
 * Creates the MCP server instance with a minimal tool surface for Phase 1 packaging.
 * Full tool registration is implemented in Phase 2 (T027).
 *
 * @returns A configured MCP Server ready for stdio transport connection.
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'spec-n-roll',
      version: TOOLKIT_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

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

const isMainModule =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
