import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IpcClient } from 'overmind';

export function registerSendMessageTool(server: McpServer, client: IpcClient): void {
  server.tool(
    'send_message',
    'Send a message to a running agent',
    {
      agentId: z.string().describe('The ID of the target agent'),
      message: z.string().describe('The message content to send'),
    },
    async ({ agentId, message }) => {
      await client.request('agent.sendMessage', { id: agentId, content: message });
      return {
        content: [{ type: 'text' as const, text: `Message sent to agent ${agentId}` }],
      };
    }
  );
}
