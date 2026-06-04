import 'reflect-metadata';

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  AttachChannel,
  AttachEventAttached,
  AttachEventOutput,
  AttachEventTerminate,
} from '@overmind-sdk/api';
import { afterEach, describe, expect, it } from 'vitest';

import { CEREBRATE_CONFIG_FILENAME } from '../../../../packages/overmind/src/infrastructure/config/cerebrate-config-loader.js';
import {
  createTempConfigDir,
  forceCleanupService,
  removeConfigDir,
  waitForServiceStop,
} from '../../../../test/integration/helpers/overmind-harness.js';
import { OvermindApiFactory } from '../../src/api/overmind-api.js';

const configDirs = new Set<string>();

afterEach(async () => {
  for (const configDir of configDirs) {
    await forceCleanupService(configDir);
    await removeConfigDir(configDir);
    configDirs.delete(configDir);
  }
});

describe.sequential('OvermindApiHandler', () => {
  it('supports the full SDK control surface including named and unnamed attach', async () => {
    const configDir = await createTrackedConfigDir();
    const api = new OvermindApiFactory().create(configDir);

    await expect(api.start({})).resolves.toEqual({
      message: 'Service started successfully.',
    });

    await expect(api.getStats({})).resolves.toMatchObject({
      runningCerebrateCount: 0,
      cerebrates: [],
    });

    await addHelloWorkflow(configDir);
    await expect(api.startCerebrate({ name: 'hello' })).resolves.toEqual({ name: 'hello' });
    await expect(
      api.startCerebrateWorkflow({ cerebrateName: 'hello', workflowName: 'daily-review' }),
    ).resolves.toEqual({
      cerebrateName: 'hello',
      workflowName: 'daily-review',
      initialState: 'inspect',
      status: 'running',
    });
    await expect(
      api.sendCerebrateCommand({ cerebrateName: 'hello', command: 'run' }),
    ).resolves.toMatchObject({
      output: expect.stringContaining('Run the cerebrate loop.'),
    });

    const namedAttach = await collectAttach(await api.attach({ name: 'hello', historyPlaybackSize: 20 }), 'hello');
    expect(namedAttach.attached).toEqual([{ name: 'hello' }]);
    expect(namedAttach.output).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'hello',
          data: expect.stringContaining('Run the cerebrate loop.'),
        }),
      ]),
    );
    expect(namedAttach.terminated).toEqual([{ name: 'hello' }]);

    const unnamedAttach = await collectAttach(await api.attach({ historyPlaybackSize: 20 }), undefined);
    expect(unnamedAttach.attached).toEqual([{ name: undefined }]);
    expect(unnamedAttach.output).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: undefined,
          data: expect.stringContaining('cerebrate command sent: hello:run'),
        }),
      ]),
    );
    expect(unnamedAttach.terminated).toEqual([{ name: undefined }]);

    await expect(api.stopCerebrate({ cerebrateName: 'hello' })).resolves.toEqual({
      stopped: true,
      message: 'Cerebrate stopped: hello',
    });
    await expect(api.shutdown({})).resolves.toEqual({
      message: 'Overmind service is shutting down.',
    });
    await waitForServiceStop(configDir);
  });
});

async function createTrackedConfigDir(): Promise<string> {
  const configDir = await createTempConfigDir();
  configDirs.add(configDir);
  return configDir;
}

async function collectAttach(
  channel: AttachChannel,
  name: string | undefined,
): Promise<{
  attached: AttachEventAttached[];
  output: AttachEventOutput[];
  terminated: AttachEventTerminate[];
}> {
  const attached: AttachEventAttached[] = [];
  const output: AttachEventOutput[] = [];
  const terminated: AttachEventTerminate[] = [];
  const errors: Error[] = [];
  let resolveAttached: (() => void) | undefined;
  const attachedPromise = new Promise<void>((resolve) => {
    resolveAttached = resolve;
  });

  channel.onAttached((event) => {
    attached.push(event);
    resolveAttached?.();
  });
  channel.onOutput((event) => {
    output.push(event);
  });
  channel.onTerminate((event) => {
    terminated.push(event);
  });
  channel.onError((error) => {
    errors.push(error);
  });

  const listenPromise = channel.listen();
  await attachedPromise;
  await channel.terminate({ name });
  await listenPromise;

  expect(errors).toEqual([]);
  return { attached, output, terminated };
}

async function addHelloWorkflow(configDir: string): Promise<void> {
  const configPath = path.join(
    configDir,
    'cerebrates',
    'hello',
    CEREBRATE_CONFIG_FILENAME,
  );
  const contents = await readFile(configPath, 'utf8');
  const updated = contents
    .replace('states: []', 'states:\n  - name: inspect\n    command: run\n    next: END')
    .replace('workflows: []', 'workflows:\n  - name: daily-review\n    initialState: inspect');
  await writeFile(
    configPath,
    updated,
    'utf8',
  );
}
