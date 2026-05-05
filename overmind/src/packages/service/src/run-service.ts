import { getDefaultOvermindPipePath } from './constants.js';
import { OvermindIpcServer } from './ipc-server.js';
import { OvermindService } from './service.js';

export async function runOvermindService(pipePath = getDefaultOvermindPipePath()): Promise<OvermindIpcServer> {
  const server = new OvermindIpcServer(new OvermindService(), pipePath);
  await server.listen();
  return server;
}