import crypto from 'node:crypto';
import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-api';
import { Cerebrate } from './cerebrate.js';

export class OvermindService implements OvermindApi {
  readonly #cerebrates = new Map<string, Cerebrate>();

  async getServiceStats(_request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    const cerebrates = Array.from(this.#cerebrates.values(), (cerebrate) => cerebrate.getStats());

    return {
      uptime: process.uptime(),
      runningCerebrateCount: cerebrates.length,
      cerebrates,
    };
  }

  async shutdown(_request: ShutdownRequest): Promise<ShutdownResponse> {
    await Promise.all(Array.from(this.#cerebrates.values(), (cerebrate) => cerebrate.stop()));
    this.#cerebrates.clear();

    return {
      success: true,
      message: 'Service shutdown requested.',
    };
  }

  async startCerebrate(_request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    const id = crypto.randomUUID();
    const cerebrate = new Cerebrate(id);

    this.#cerebrates.set(id, cerebrate);
    cerebrate.start();

    return { id };
  }

  async stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    const cerebrate = this.#cerebrates.get(request.id);

    if (!cerebrate) {
      return {
        stopped: false,
        message: `Cerebrate not found: ${request.id}`,
      };
    }

    await cerebrate.stop();
    this.#cerebrates.delete(request.id);

    return {
      stopped: true,
      message: `Cerebrate stopped: ${request.id}`,
    };
  }
}
