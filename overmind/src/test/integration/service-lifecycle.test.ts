import { access } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createIpcClient,
  createTempConfigDir,
  forceCleanupService,
  removeConfigDir,
  runOvermindCli,
  waitForServiceStop,
} from './helpers/overmind-harness.js';

const configDirs = new Set<string>();

afterEach(async () => {
  for (const configDir of configDirs) {
    await forceCleanupService(configDir);
    await removeConfigDir(configDir);
    configDirs.delete(configDir);
  }
});

describe.sequential('service lifecycle', () => {
  it('starts the service, returns stats, and rejects duplicate start attempts', async () => {
    const configDir = await createTrackedConfigDir();
    const client = createIpcClient(configDir);

    const firstStart = await runOvermindCli(['start', '--config-dir', configDir]);
    expect(firstStart.code).toBe(0);

    await expect(access(path.join(configDir, 'overmind-config.yaml'))).resolves.toBeUndefined();
    await expect(
      access(path.join(configDir, 'cerebrates', 'hello', 'cerebrate-config.yaml')),
    ).resolves.toBeUndefined();

    const stats = await client.getStats({});
    expect(stats.runningCerebrateCount).toBe(0);
    expect(stats.cerebrates).toEqual([]);
    expect(stats.uptime).toBeGreaterThanOrEqual(0);

    const secondStart = await runOvermindCli(['start', '--config-dir', configDir]);
    expect(secondStart.code).toBe(1);
    expect(`${secondStart.stdout}${secondStart.stderr}`).toContain(
      `Overmind service is already running for config dir "${configDir}".`,
    );
  });

  it('shuts down cooperatively and fails subsequent stats requests', async () => {
    const configDir = await createTrackedConfigDir();
    const client = createIpcClient(configDir);

    const start = await runOvermindCli(['start', '--config-dir', configDir]);
    expect(start.code).toBe(0);

    const shutdown = await runOvermindCli(['shutdown', '--config-dir', configDir]);
    expect(shutdown.code).toBe(0);
    expect(`${shutdown.stdout}${shutdown.stderr}`).toContain('Overmind service is shutting down.');

    await waitForServiceStop(configDir);
    await expect(client.getStats({})).rejects.toThrow();
  });
});

async function createTrackedConfigDir(): Promise<string> {
  const configDir = await createTempConfigDir();
  configDirs.add(configDir);
  return configDir;
}
