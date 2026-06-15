import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Registers one group of MCP tool handlers on a server instance.
 */
export interface McpTool {
  /**
   * Adds this tool group to the provided server.
   *
   * @param server - MCP server instance receiving tool registrations.
   */
  register(server: McpServer): void;
}
