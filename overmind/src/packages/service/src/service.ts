import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  ShutdownRequest,
  ShutdownResponse,
} from 'overmind-api';

interface OvermindServiceOptions {
  onShutdown: () => void;
}

export class OvermindService implements OvermindApi {
  private readonly startedAt = process.hrtime.bigint();
  private readonly onShutdown: () => void;

  constructor(options: OvermindServiceOptions) {
    this.onShutdown = options.onShutdown;
  }

  async getServiceStats(_request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    return {
      uptime: this.getUptimeSeconds(),
    };
  }

  async shutdown(_request: ShutdownRequest): Promise<ShutdownResponse> {
    setImmediate(this.onShutdown);

    return {
      success: true,
      message: 'Overmind service shutting down.',
    };
  }

  private getUptimeSeconds(): number {
    const elapsedNanoseconds = process.hrtime.bigint() - this.startedAt;
    return Number(elapsedNanoseconds) / 1_000_000_000;
  }
}