import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  ensureOvermindConfig,
  loadOvermindConfig,
  OVERMIND_CONFIG_FILENAME,
} from '../../src/infrastructure/config/overmind-config-loader.js';

const tempDirs = new Set<string>();

afterEach(async () => {
  for (const tempDir of tempDirs) {
    await rm(tempDir, { force: true, recursive: true });
    tempDirs.delete(tempDir);
  }
});

describe('overmind-config-loader', () => {
  it('creates the default overmind config when it is missing', async () => {
    const configDir = await createTempDir();

    ensureOvermindConfig(configDir);

    const filePath = path.join(configDir, OVERMIND_CONFIG_FILENAME);
    const fileContents = await readFile(filePath, 'utf8');

    expect(fileContents).toContain('version: 1');
    expect(fileContents).toContain('gpt-5-mini');
  });

  it('loads a valid overmind config and includes the config dir', async () => {
    const configDir = await createTempDir();
    const filePath = path.join(configDir, OVERMIND_CONFIG_FILENAME);

    await writeFile(filePath, [
      'name: custom-overmind',
      'version: 1',
      'llm:',
      '  chain:',
      '    - agents:',
      '        - agent: copilot-cli',
      '          model: gpt-5-mini',
    ].join('\n'));

    const config = loadOvermindConfig(configDir);

    expect(config.name).toBe('custom-overmind');
    expect(config.version).toBe(1);
    expect(config.configDir).toBe(configDir);
    expect(config.llm.chain).toHaveLength(1);
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'overmind-config-loader-'));
  tempDirs.add(tempDir);
  return tempDir;
}
