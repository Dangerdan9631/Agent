import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IpcClient } from 'overmind';
import type { AgentInfo } from 'overmind';

export function registerListAgentsTool(server: McpServer, client: IpcClient): void {
  server.tool(
    'list_agents',
    'List all running agents and their current states',
    {},
    async () => {
      const agents = await client.request<AgentInfo[]>('agent.list');
      const text =
        agents.length === 0
          ? 'No agents running.'
          : agents.map((a) => `${a.id}  ${a.type}  ${a.state}`).join('\n');
      return {
        content: [{ type: 'text' as const, text }],
      };
    }
  );
}
