import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { OvermindService } from '../../src/service/overmind-service.js';

describe('OvermindService', () => {
  it('reports uptime and empty cerebrate stats', async () => {
    const service = new OvermindService({} as never);
    (service as never).startedAt = Date.now() - 2_000;

    const stats = await service.getStats({});

    expect(stats.runningCerebrateCount).toBe(0);
    expect(stats.cerebrates).toEqual([]);
    expect(stats.uptime).toBeGreaterThan(1.5);
  });

  it('stops the IPC server during shutdown', async () => {
    const ipcServer = {
      stop: vi.fn(),
    };
    const service = new OvermindService(ipcServer as never);
    (service as never).startedAt = Date.now() - 1_000;

    await expect(service.shutdown({})).resolves.toEqual({
      message: 'Overmind service is shutting down.',
    });

    expect(ipcServer.stop).toHaveBeenCalledTimes(1);
    expect((service as never).startedAt).toBe(0);
  });
});
