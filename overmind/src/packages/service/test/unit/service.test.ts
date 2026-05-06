import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PIPE_NAME, getDefaultOvermindPipePath } from '../../src/constants.js';
import { OvermindService } from '../../src/service.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('OvermindService', () => {
  it('reports service stats', async () => {
    const service = new OvermindService();

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      cerebrates: [],
      runningCerebrateCount: 0,
      uptime: expect.any(Number),
    });
  });

  it('returns a shutdown acknowledgement', async () => {
    const service = new OvermindService();

    await expect(service.shutdown({})).resolves.toEqual({
      success: true,
      message: 'Service shutdown requested.',
    });
  });

  it('starts and stops a cerebrate', async () => {
    const service = new OvermindService();

    const { id } = await service.startCerebrate({});

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      runningCerebrateCount: 1,
      cerebrates: [
        {
          id,
          idleLoopCount: 1,
          runtime: expect.any(Number),
          state: 'idle',
        },
      ],
    });

    await expect(service.stopCerebrate({ id })).resolves.toEqual({
      stopped: true,
      message: `Cerebrate stopped: ${id}`,
    });

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      cerebrates: [],
      runningCerebrateCount: 0,
    });
  });

  it('increments the cerebrate idle loop count each time idle sleeps', async () => {
    vi.useFakeTimers();
    const service = new OvermindService();

    const { id } = await service.startCerebrate({});
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      cerebrates: [
        {
          id,
          idleLoopCount: 2,
        },
      ],
    });

    await service.stopCerebrate({ id });
  });

  it('reports when a cerebrate does not exist', async () => {
    const service = new OvermindService();

    await expect(service.stopCerebrate({ id: 'missing' })).resolves.toEqual({
      stopped: false,
      message: 'Cerebrate not found: missing',
    });
  });
});

describe('getDefaultOvermindPipePath', () => {
  it('uses the default pipe name', () => {
    expect(getDefaultOvermindPipePath()).toContain(DEFAULT_PIPE_NAME);
  });

  it('accepts a custom pipe name', () => {
    expect(getDefaultOvermindPipePath('custom-overmind')).toContain('custom-overmind');
  });
});
