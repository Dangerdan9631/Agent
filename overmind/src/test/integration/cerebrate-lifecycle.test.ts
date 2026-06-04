import { afterEach, describe, expect, it } from 'vitest';

import {
  createIpcClient,
  createTempConfigDir,
  forceCleanupService,
  removeConfigDir,
  runOvermindCli,
} from './helpers/overmind-harness.js';

const configDirs = new Set<string>();

afterEach(async () => {
  for (const configDir of configDirs) {
    await forceCleanupService(configDir);
    await removeConfigDir(configDir);
    configDirs.delete(configDir);
  }
});

describe.sequential('cerebrate lifecycle', () => {
  it('starts, reports, sends commands to, and stops a cerebrate', async () => {
    const configDir = await createTrackedConfigDir();
    const start = await runOvermindCli(['start', '--config-dir', configDir]);
    expect(start.code).toBe(0);

    const client = createIpcClient(configDir);

    await expect(client.startCerebrate({ name: 'hello' })).resolves.toEqual({
      name: 'hello',
    });

    const statsAfterStart = await client.getStats({});
    expect(statsAfterStart.runningCerebrateCount).toBe(1);
    expect(statsAfterStart.cerebrates[0]?.name).toBe('hello');

    const commandResponse = await client.sendCerebrateCommand({
      cerebrateName: 'hello',
      command: 'run',
    });
    expect(commandResponse.output).toContain('Run the cerebrate loop.');

    await expect(client.startCerebrate({ name: 'hello' })).rejects.toBeTruthy();

    await expect(client.stopCerebrate({ cerebrateName: 'hello' })).resolves.toEqual({
      stopped: true,
      message: 'Cerebrate stopped: hello',
    });

    const statsAfterStop = await client.getStats({});
    expect(statsAfterStop.runningCerebrateCount).toBe(0);
    expect(statsAfterStop.cerebrates).toEqual([]);
  });
});

async function createTrackedConfigDir(): Promise<string> {
  const configDir = await createTempConfigDir();
  configDirs.add(configDir);
  return configDir;
}
