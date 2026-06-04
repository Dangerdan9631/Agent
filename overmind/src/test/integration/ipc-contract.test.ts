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

describe.sequential('IPC contract smoke tests', () => {
  it('exposes the expanded non-streaming method set over IPC', async () => {
    const configDir = await createTrackedConfigDir();
    const start = await runOvermindCli(['start', '--config-dir', configDir]);
    expect(start.code).toBe(0);

    const client = createIpcClient(configDir);

    await expect(client.getStats({})).resolves.toMatchObject({
      runningCerebrateCount: 0,
      cerebrates: [],
    });

    await expect(client.startCerebrate({ name: 'hello' })).resolves.toEqual({
      name: 'hello',
    });
    await expect(
      client.sendCerebrateCommand({ cerebrateName: 'hello', command: 'run' }),
    ).resolves.toMatchObject({
      output: expect.stringContaining('Run the cerebrate loop.'),
    });
    await expect(client.stopCerebrate({ cerebrateName: 'hello' })).resolves.toEqual({
      stopped: true,
      message: 'Cerebrate stopped: hello',
    });
  });
});

async function createTrackedConfigDir(): Promise<string> {
  const configDir = await createTempConfigDir();
  configDirs.add(configDir);
  return configDir;
}
