import fs from 'fs';
import { SOCKET_PATH } from 'overmind';
import { AgentManager } from './agent-manager.js';
import { IpcServer } from './server.js';

// Clean up stale socket file on Unix
if (process.platform !== 'win32') {
  try { fs.unlinkSync(SOCKET_PATH); } catch { /* no stale socket */ }
}

const agentManager = new AgentManager();
const server = new IpcServer(agentManager);

server.listen();

function shutdown(): void {
  console.log('[overmind-service] Shutting down...');
  server.close(() => {
    if (process.platform !== 'win32') {
      try { fs.unlinkSync(SOCKET_PATH); } catch { /* ignore */ }
    }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
