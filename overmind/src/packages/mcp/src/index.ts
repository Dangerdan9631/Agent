import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { IpcClient } from 'overmind';
import { registerSendMessageTool } from './tools/send-message.js';
import { registerListAgentsTool } from './tools/list-agents.js';
import { registerAttachStreamTool } from './tools/attach-stream.js';

async function main(): Promise<void> {
  const client = new IpcClient();
  await client.connect();

  const server = new McpServer({
    name: 'overmind',
    version: '0.1.0',
  });

  registerSendMessageTool(server, client);
  registerListAgentsTool(server, client);
  registerAttachStreamTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[overmind-mcp] Fatal:', err);
  process.exit(1);
});
