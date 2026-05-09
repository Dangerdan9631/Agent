import 'reflect-metadata';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { DEFAULT_PIPE_NAME, getDefaultOvermindPipePath } from '../../src/constants.js';
import { OvermindService } from '../../src/service.js';

afterEach(() => {
  vi.useRealTimers();
});

function makeTestConfigDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'overmind-test-'));
}

describe('OvermindService', () => {
  it('reports service stats', async () => {
    const service = buildContainer(makeTestConfigDir()).resolve(OvermindService);

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      cerebrates: [],
      runningCerebrateCount: 0,
      uptime: expect.any(Number),
    });
  });

  it('returns a shutdown acknowledgement', async () => {
    const service = buildContainer(makeTestConfigDir()).resolve(OvermindService);

    await expect(service.shutdown({})).resolves.toEqual({
      success: true,
      message: 'Service shutdown requested.',
    });
  });

  it('starts and stops a cerebrate', async () => {
    const service = buildContainer(makeTestConfigDir()).resolve(OvermindService);

    const { name } = await service.startCerebrate({ name: 'hello' });

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      runningCerebrateCount: 1,
      cerebrates: [
        {
          name: 'hello',
          idleLoopCount: 1,
          runtime: expect.any(Number),
          state: 'idle',
        },
      ],
    });

    expect(name).toBe('hello');

    await expect(service.stopCerebrate({ name: 'hello' })).resolves.toEqual({
      stopped: true,
      message: 'Cerebrate stopped: hello',
    });

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      cerebrates: [],
      runningCerebrateCount: 0,
    });
  });

  it('increments the cerebrate idle loop count each time idle sleeps', async () => {
    vi.useFakeTimers();
    const service = buildContainer(makeTestConfigDir()).resolve(OvermindService);

    await service.startCerebrate({ name: 'hello' });
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      cerebrates: [
        {
          name: 'hello',
          idleLoopCount: 2,
        },
      ],
    });

    await service.stopCerebrate({ name: 'hello' });
  });

  it('reports when a cerebrate does not exist', async () => {
    const service = buildContainer(makeTestConfigDir()).resolve(OvermindService);

    await expect(service.stopCerebrate({ name: 'missing' })).resolves.toEqual({
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
