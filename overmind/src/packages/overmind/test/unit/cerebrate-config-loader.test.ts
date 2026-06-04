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
      'states:',
      '  - name: inspect',
      '    command: run',
      '    next: END',
      '    branches:',
      '      - when:',
      '          outputContains: needs-validation',
      '        next: END',
      'workflows:',
      '  - name: daily-review',
      '    initialState: inspect',
    ].join('\n'));

    const config = loadCerebrateConfig(cerebrateDir);

    expect(config.description).toBe('Test cerebrate');
    expect(config.taskId).toBe('TEST');
    expect(config.commands).toHaveLength(1);
    expect(config.commands[0]?.name).toBe('run');
    expect(config.states).toEqual([
      {
        name: 'inspect',
        command: 'run',
        next: 'END',
        branches: [
          {
            when: {
              outputContains: 'needs-validation',
            },
            next: 'END',
          },
        ],
      },
    ]);
    expect(config.workflows).toEqual([
      {
        name: 'daily-review',
        initialState: 'inspect',
      },
    ]);
  });

  it('rejects unknown state references and unknown workflow commands', async () => {
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
      'states:',
      '  - name: inspect',
      '    command: missing-command',
      '    next: missing-state',
      '    onError: recover',
      'workflows:',
      '  - name: daily-review',
      '    initialState: missing-state',
    ].join('\n'));

    const message = getLoadErrorMessage(cerebrateDir);
    expect(message).toContain('Unknown command \\"missing-command\\".');
    expect(message).toContain('Unknown workflow target \\"missing-state\\".');
    expect(message).toContain('Unknown workflow target \\"recover\\".');
    expect(message).toContain('Unknown initial state \\"missing-state\\".');
  });

  it('rejects invalid branch conditions and malformed regex values', async () => {
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
      'states:',
      '  - name: inspect',
      '    command: run',
      '    next: END',
      '    branches:',
      '      - when: {}',
      '        next: END',
      '      - when:',
      '          outputRegex: "["',
      '        next: END',
    ].join('\n'));

    const message = getLoadErrorMessage(cerebrateDir);
    expect(message).toContain('Branch conditions must define at least one supported field.');
    expect(message).toContain('Invalid outputRegex: Invalid regular expression: /[/: Unterminated character class');
  });

  it('rejects reserved END as a state name', async () => {
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
      'states:',
      '  - name: END',
      '    command: run',
      '    next: END',
      'workflows:',
      '  - name: daily-review',
      '    initialState: END',
    ].join('\n'));

    expect(getLoadErrorMessage(cerebrateDir)).toContain('State name \\"END\\" is reserved.');
  });
});

function getLoadErrorMessage(cerebrateDir: string): string {
  try {
    loadCerebrateConfig(cerebrateDir);
  } catch (error) {
    return (error as Error).message;
  }

  throw new Error('Expected cerebrate config load to fail.');
}

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cerebrate-config-loader-'));
  tempDirs.add(tempDir);
  return tempDir;
}
