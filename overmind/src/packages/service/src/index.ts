import fs from 'fs';
import { SOCKET_PATH } from 'overmind';
import { OvermindService } from './service.js';
import { IpcServer } from './server.js';

// Clean up stale socket file on Unix
if (process.platform !== 'win32') {
  try { fs.unlinkSync(SOCKET_PATH); } catch { /* no stale socket */ }
}

function shutdown(): void {
  console.log('[overmind-service] Shutting down...');
  server.close(() => {
    if (process.platform !== 'win32') {
      try { fs.unlinkSync(SOCKET_PATH); } catch { /* ignore */ }
    }
    process.exit(0);
  });
}

const service = new OvermindService({
  onShutdown: () => shutdown(),
});
const server = new IpcServer(service);

server.listen();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
