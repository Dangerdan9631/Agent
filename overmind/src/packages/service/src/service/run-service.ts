import path from 'node:path';
import { loadCerebrateConfig } from '../config/cerebrate-config.js';
import { buildContainer } from '../container.js';
import { getOvermindPipePath } from '../constants.js';
import { OvermindIpcServer } from '../ipc-server.js';
import { OvermindService } from '../service.js';

export interface RunOvermindServiceOptions {
  configDir: string;
  pipePath?: string;
}

export async function runOvermindService(options: RunOvermindServiceOptions): Promise<OvermindIpcServer> {
  // Scaffold the default 'hello' cerebrate definition if it doesn't exist yet.
  const helloDir = path.join(options.configDir, 'cerebrates', 'hello');
  loadCerebrateConfig(helloDir, true);

  const pipePath = options.pipePath ?? getOvermindPipePath(options.configDir);
  const di = buildContainer(options.configDir);
  const server = new OvermindIpcServer(di.resolve(OvermindService), pipePath);
  await server.listen();
  return server;
}
