import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { OvermindIpcClient } from './client.js';

const require = createRequire(__filename);

export interface StartServiceResult {
  started: boolean;
  message: string;
}

export async function startOvermindService(client = new OvermindIpcClient()): Promise<StartServiceResult> {
  if (await client.isRunning()) {
    return {
      started: false,
      message: 'Service is already running.',
    };
  }

  const serviceEntryPath = require.resolve('overmind-service');
  const serviceBinPath = path.resolve(path.dirname(serviceEntryPath), 'bin.js');

  const child = spawn(process.execPath, [serviceBinPath], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  await waitForService(client);

  return {
    started: true,
    message: 'Service started.',
  };
}

async function waitForService(client: OvermindIpcClient): Promise<void> {
  const startedAt = Date.now();
  const timeoutMs = 5_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (await client.isRunning()) {
      return;
    }

    await delay(100);
  }

  throw new Error('Timed out waiting for service startup.');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}