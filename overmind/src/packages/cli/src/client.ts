import net from 'node:net';
import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  OvermindApiMethod,
  OvermindApiRequestMap,
  OvermindApiResponseMap,
  ShutdownRequest,
  ShutdownResponse,
} from 'overmind-api';
import { getDefaultOvermindPipePath } from 'overmind-service';

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
}