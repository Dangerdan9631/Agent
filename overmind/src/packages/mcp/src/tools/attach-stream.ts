import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IpcClient } from 'overmind';
import type { StreamChunk } from 'overmind';

export function registerAttachStreamTool(server: McpServer, client: IpcClient): void {
  server.tool(
    'attach_stream',
    'Attach to an agent output stream and collect output until done (read-only)',
    {
      agentId: z.string().describe('The ID of the agent to attach to'),
      timeoutMs: z
        .number()
        .optional()
        .default(30000)
        .describe('Maximum milliseconds to collect output (default 30000)'),
    },
    async ({ agentId, timeoutMs }) => {
      const buffer: string[] = [];

      const output = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          unsubscribe();
          resolve(buffer.join(''));
        }, timeoutMs);

        const unsubscribe = client.subscribe('stream.chunk', (data) => {
          const chunk = data as StreamChunk;
          if (chunk.agentId !== agentId) return;
          buffer.push(chunk.chunk);
          if (chunk.done) {
            clearTimeout(timer);
            unsubscribe();
            resolve(buffer.join(''));
          }
        });

        client.request('agent.attachStream', { id: agentId }).catch((err) => {
          clearTimeout(timer);
          unsubscribe();
          reject(err);
        });
      });

      return {
        content: [{ type: 'text' as const, text: output || '(no output)' }],
      };
    }
  );
}
