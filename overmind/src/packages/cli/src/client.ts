import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  OvermindApiMethod,
  OvermindApiRequestMap,
  OvermindApiResponseMap,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-api';
import { getDefaultOvermindPipePath } from 'overmind-service';

export type StartServiceRequest = Record<string, never>;

export interface StartServiceResponse {
  started: boolean;
  message: string;
}

interface OvermindIpcSuccessResponse<TMethod extends OvermindApiMethod> {
  method: TMethod;
  result: OvermindApiResponseMap[TMethod];
}

interface OvermindIpcErrorResponse {
  method: string;
  error: string;
}

export class OvermindIpcClient implements OvermindApi {
  readonly #pipePath: string;

  constructor(pipePath = getDefaultOvermindPipePath()) {
    this.#pipePath = pipePath;
  }

  getServiceStats(request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    return this.#send('service.stats', request);
  }

  shutdown(request: ShutdownRequest): Promise<ShutdownResponse> {
    return this.#send('service.shutdown', request);
  }

  startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    return this.#send('cerebrate.start', request);
  }

  stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    return this.#send('cerebrate.stop', request);
  }

  async startService(_request: StartServiceRequest): Promise<StartServiceResponse> {
    if (await this.isRunning()) {
      return {
        started: false,
        message: 'Service is already running.',
      };
    }

    const serviceEntryPath = fileURLToPath(import.meta.resolve('overmind-service'));
    const serviceBinPath = path.resolve(path.dirname(serviceEntryPath), 'bin.js');

    const child = spawn(process.execPath, [serviceBinPath], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    await this.#waitForService();

    return {
      started: true,
      message: 'Service started.',
    };
  }

  async isRunning(): Promise<boolean> {
    try {
      await this.getServiceStats({});
      return true;
    } catch {
      return false;
    }
  }

  async #send<TMethod extends OvermindApiMethod>(
    method: TMethod,
    params: OvermindApiRequestMap[TMethod],
  ): Promise<OvermindApiResponseMap[TMethod]> {
    const response = await new Promise<OvermindIpcSuccessResponse<TMethod> | OvermindIpcErrorResponse>((resolve, reject) => {
      const socket = net.createConnection(this.#pipePath);
      let buffer = '';
      let settled = false;

      socket.setEncoding('utf8');

      socket.once('connect', () => {
        socket.write(`${JSON.stringify({ method, params })}\n`);
      });

      socket.on('data', (chunk) => {
        buffer += chunk;
        if (settled || !buffer.includes('\n')) {
          return;
        }

        settled = true;

        try {
          const [rawResponse] = buffer.split('\n', 1);
          resolve(JSON.parse(rawResponse) as OvermindIpcSuccessResponse<TMethod> | OvermindIpcErrorResponse);
          socket.end();
        } catch (error) {
          reject(error);
        }
      });

      socket.once('end', () => {
        if (!settled) {
          reject(new Error('Service closed the IPC connection before sending a response.'));
        }
      });

      socket.once('error', (error) => {
        reject(error);
      });
    });

    if ('error' in response) {
      throw new Error(response.error);
    }

    return response.result;
  }

  async #waitForService(): Promise<void> {
    const startedAt = Date.now();
    const timeoutMs = 5_000;

    while (Date.now() - startedAt < timeoutMs) {
      if (await this.isRunning()) {
        return;
      }

      await delay(100);
    }

    throw new Error('Timed out waiting for service startup.');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
