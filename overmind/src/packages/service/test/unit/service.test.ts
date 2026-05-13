import 'reflect-metadata';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { container, type DependencyContainer } from 'tsyringe';
import { getOvermindPipePath } from 'overmind-api';
import { loadCerebrateConfig, loadOvermindConfig, OvermindConfigToken } from '../../src/config/index.js';
import { CerebrateController } from '../../src/controllers/cerebrate.controller.js';
import { ServiceController } from '../../src/controllers/service.controller.js';
import { createLlmChain, LlmChain } from '../../src/llm/index.js';
import { BufferedLogBuffer, BufferedLoggerFactory, LoggerFactoryToken } from '../../src/logging/index.js';

afterEach(() => {
  vi.useRealTimers();
});

function makeTestConfigDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'overmind-test-'));
}

function buildTestContainer(configDir: string): DependencyContainer {
  const helloDir = path.join(configDir, 'cerebrates', 'hello');
  loadCerebrateConfig(helloDir, true);

  const child = container.createChildContainer();
  const overmindConfig = loadOvermindConfig(configDir);
  const logBuffer = new BufferedLogBuffer();
  child.register(OvermindConfigToken, { useValue: overmindConfig });
  child.register(LlmChain, { useValue: createLlmChain(overmindConfig.llm) });
  child.register(BufferedLogBuffer, { useValue: logBuffer });
  child.register(LoggerFactoryToken, { useValue: new BufferedLoggerFactory(logBuffer) });
  return child;
}

describe('service controllers', () => {
  it('reports service stats', async () => {
    const di = buildTestContainer(makeTestConfigDir());
    const service = di.resolve(ServiceController);

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      success: true,
      result: {
      cerebrates: [],
      runningCerebrateCount: 0,
      uptime: expect.any(Number),
      },
    });
  });

  it('returns a shutdown acknowledgement', async () => {
    const di = buildTestContainer(makeTestConfigDir());
    const service = di.resolve(ServiceController);

    await expect(service.shutdown({})).resolves.toEqual({
      success: true,
      result: {
        success: true,
        message: 'Service shutdown requested.',
      },
    });
  });

  it('starts and stops a cerebrate', async () => {
    const di = buildTestContainer(makeTestConfigDir());
    const service = di.resolve(ServiceController);
    const cerebrates = di.resolve(CerebrateController);

    await expect(cerebrates.startCerebrate({ name: 'hello' })).resolves.toEqual({
      success: true,
      result: { name: 'hello' },
    });

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      success: true,
      result: {
        runningCerebrateCount: 1,
        cerebrates: [
          {
            name: 'hello',
            idleLoopCount: 1,
            runtime: expect.any(Number),
            state: 'idle',
          },
        ],
      },
    });

    await expect(cerebrates.stopCerebrate({ name: 'hello' })).resolves.toEqual({
      success: true,
      result: {
        stopped: true,
        message: 'Cerebrate stopped: hello',
      },
    });

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      success: true,
      result: {
        cerebrates: [],
        runningCerebrateCount: 0,
      },
    });
  });

  it('increments the cerebrate idle loop count each time idle sleeps', async () => {
    vi.useFakeTimers();
    const di = buildTestContainer(makeTestConfigDir());
    const service = di.resolve(ServiceController);
    const cerebrates = di.resolve(CerebrateController);

    await cerebrates.startCerebrate({ name: 'hello' });
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(service.getServiceStats({})).resolves.toMatchObject({
      success: true,
      result: {
        cerebrates: [
          {
            name: 'hello',
            idleLoopCount: 2,
          },
        ],
      },
    });

    await cerebrates.stopCerebrate({ name: 'hello' });
  });

  it('reports when a cerebrate does not exist', async () => {
    const di = buildTestContainer(makeTestConfigDir());
    const cerebrates = di.resolve(CerebrateController);

    await expect(cerebrates.stopCerebrate({ name: 'missing' })).resolves.toEqual({
      success: true,
      result: {
        stopped: false,
        message: 'Cerebrate not found: missing',
      },
    });
  });
});

describe('getOvermindPipePath', () => {
  it('uses the default pipe name in the generated path', () => {
    expect(getOvermindPipePath(makeTestConfigDir())).toContain('overmind');
  });

  it('includes the config directory name in the generated path', () => {
    const configDir = path.join(makeTestConfigDir(), 'custom-overmind');
    fs.mkdirSync(configDir, { recursive: true });

    expect(getOvermindPipePath(configDir)).toContain('custom-overmind');
  });
});
