import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { CEREBRATE_CONFIG_FILENAME } from '../../packages/overmind/src/infrastructure/config/cerebrate-config-loader.js';
import {
  createApi,
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

describe.sequential('cerebrate workflow', () => {
  it('starts a workflow through the CLI and emits completion logs to the global stream', async () => {
    const configDir = await createTrackedConfigDir();

    const start = await runOvermindCli(['start', '--config-dir', configDir]);
    expect(start.code).toBe(0);
    await addHelloWorkflow(configDir);

    const client = createIpcClient(configDir);
    const api = createApi(configDir);

    await expect(client.startCerebrate({ name: 'hello' })).resolves.toEqual({
      name: 'hello',
    });

    const startWorkflow = await runOvermindCli(
      ['start-workflow', 'hello', 'daily-review', '--config-dir', configDir],
    );
    expect(startWorkflow.code).toBe(0);
    expect(startWorkflow.stdout).toContain('daily-review');
    expect(startWorkflow.stdout).toContain('inspect');
    expect(startWorkflow.stdout).toContain('running');

    await new Promise((resolve) => setTimeout(resolve, 100));

    const channel = await api.attach({ historyPlaybackSize: 100 });
    const output: string[] = [];
    channel.onOutput((event) => {
      output.push(event.data);
    });
    const listenPromise = channel.listen();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await channel.terminate({ name: undefined });
    await listenPromise;

    expect(output.some((line) => line.includes('[workflow:completion]'))).toBe(true);
    expect(output.some((line) => line.includes('hello:daily-review'))).toBe(true);
  });
});

async function createTrackedConfigDir(): Promise<string> {
  const configDir = await createTempConfigDir();
  configDirs.add(configDir);
  return configDir;
}

async function addHelloWorkflow(configDir: string): Promise<void> {
  const configPath = path.join(configDir, 'cerebrates', 'hello', CEREBRATE_CONFIG_FILENAME);
  const contents = await readFile(configPath, 'utf8');
  const updated = contents
    .replace('states: []', 'states:\n  - name: inspect\n    command: run\n    next: END')
    .replace('workflows: []', 'workflows:\n  - name: daily-review\n    initialState: inspect');
  await writeFile(configPath, updated, 'utf8');
}
