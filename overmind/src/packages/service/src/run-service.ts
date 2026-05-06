import { getDefaultOvermindPipePath } from './constants.js';
import { OvermindIpcServer } from './ipc-server.js';
import { OvermindService } from './service.js';

export interface RunOvermindServiceOptions {
  configDir: string;
  pipePath?: string;
}

export async function runOvermindService(options: RunOvermindServiceOptions): Promise<OvermindIpcServer> {
  const pipePath = options.pipePath ?? getDefaultOvermindPipePath();
  const server = new OvermindIpcServer(new OvermindService(options.configDir), pipePath);
  await server.listen();
  return server;
}
