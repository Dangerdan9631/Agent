import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  CEREBRATE_CONFIG_FILENAME,
  ensureDefaultCerebrateConfig,
  loadCerebrateConfig,
} from '../../src/infrastructure/config/cerebrate-config-loader.js';

const tempDirs = new Set<string>();

afterEach(async () => {
  for (const tempDir of tempDirs) {
    await rm(tempDir, { force: true, recursive: true });
    tempDirs.delete(tempDir);
  }
});

describe('cerebrate-config-loader', () => {
  it('creates the default cerebrate config with legacy lifecycle commands', async () => {
    const cerebrateDir = await createTempDir();

    ensureDefaultCerebrateConfig(cerebrateDir);

    const filePath = path.join(cerebrateDir, CEREBRATE_CONFIG_FILENAME);
    const fileContents = await readFile(filePath, 'utf8');

    expect(fileContents).toContain('name: run');
    expect(fileContents).toContain('name: shutdown');
    expect(fileContents).toContain('name: attach');
  });

  it('loads a valid cerebrate config', async () => {
    const cerebrateDir = await createTempDir();
    const filePath = path.join(cerebrateDir, CEREBRATE_CONFIG_FILENAME);

    await writeFile(filePath, [
      'description: Test cerebrate',
      'taskId: TEST',
      'nextTaskNumber: 1',
      'responsibilities: Run test tasks',
      'commands:',
      '  - name: run',
      '    value:',
      '      type: text',
      '      text: Run the cerebrate',
    ].join('\n'));

    const config = loadCerebrateConfig(cerebrateDir);

    expect(config.description).toBe('Test cerebrate');
    expect(config.taskId).toBe('TEST');
    expect(config.commands).toHaveLength(1);
    expect(config.commands[0]?.name).toBe('run');
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cerebrate-config-loader-'));
  tempDirs.add(tempDir);
  return tempDir;
}
