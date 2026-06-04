import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createConfigOptions } from '@overmind-sdk/config';
import { OvermindIpcClient } from '@overmind-sdk/ipc/overmind-ipc-client';
import { OvermindApiFactory } from 'overmind-sdk';

export async function createTempConfigDir(prefix = 'overmind-it-'): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeConfigDir(configDir: string): Promise<void> {
  await rm(configDir, { force: true, recursive: true });
}

export function createApi(configDir: string): ReturnType<OvermindApiFactory['create']> {
  return new OvermindApiFactory().create(configDir);
}

export function createIpcClient(configDir: string): OvermindIpcClient {
  return new OvermindIpcClient(createConfigOptions(configDir));
}

export function getCliBinPath(): string {
  return path.resolve('packages/overmind-cli/dist/bin.js');
}

export function getServiceBinPath(): string {
  return path.resolve('packages/overmind/dist/bin.js');
}

export function spawnOvermindCli(args: string[], cwd = process.cwd()): ChildProcess {
  return spawn(process.execPath, [getCliBinPath(), ...args], {
    cwd,
    stdio: 'pipe',
  });
}

export async function runOvermindCli(
  args: string[],
  cwd = process.cwd(),
): Promise<{ code: number | null; stderr: string; stdout: string }> {
  const child = spawnOvermindCli(args, cwd);
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout?.on('data', (chunk: Buffer) => {
    stdoutChunks.push(chunk);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });

  const code = await new Promise<number | null>((resolve) => {
    child.once('close', resolve);
  });

  return {
    code,
    stderr: Buffer.concat(stderrChunks).toString('utf8'),
    stdout: Buffer.concat(stdoutChunks).toString('utf8'),
  };
}

export async function waitForServiceStop(
  configDir: string,
  timeoutMs = 5_000,
): Promise<void> {
  const client = createIpcClient(configDir);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await client.getStats({});
    } catch {
      return;
    }

    await sleep(100);
  }

  throw new Error(`Timed out waiting for service shutdown for "${configDir}".`);
}

export async function forceCleanupService(configDir: string): Promise<void> {
  try {
    await runOvermindCli(['shutdown', '--force', '--config-dir', configDir]);
  } catch {
    // Best-effort cleanup only.
  }

  try {
    await waitForServiceStop(configDir, 1_000);
  } catch {
    // Ignore cleanup timing failures to avoid masking test assertions.
  }
}

async function sleep(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
