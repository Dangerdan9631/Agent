import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentConfigApi } from '../../src';
import { registerAll } from '../../../plugins/src';
import type { GenerateEvent } from 'agentconfig-api';
import { createTempDir, readText, removeDir, writeTree } from '../test-utils';

const chokidarMock = vi.hoisted(() => {
  const watcher = {
    on: vi.fn(),
  };
  watcher.on.mockReturnValue(watcher);

  return {
    watch: vi.fn(() => watcher),
    watcher,
  };
});

vi.mock('chokidar', () => ({
  default: {
    watch: chokidarMock.watch,
  },
}));

const tempDirs: string[] = [];

afterEach(() => {
  vi.clearAllMocks();

  while (tempDirs.length > 0) {
    removeDir(tempDirs.pop() as string);
  }
});

describe('operations', () => {
  it('emits generate output through the event callback', async () => {
    const api = createAgentConfigApi(registerAll);
    const projectDir = createTempDir('agentconfig-run-generate-');
    tempDirs.push(projectDir);
    const events: GenerateEvent[] = [];

    writeTree(projectDir, {
      '.agentconfig/config.yaml': ['version: 1', 'targets:', '  - copilot', ''].join('\n'),
      '.agentconfig/instructions/always-rule.md': 'Always keep changes reviewable.\n',
    });

    await api.generate({
      configPath: path.join(projectDir, '.agentconfig'),
      onEvent: (event) => events.push(event),
    });

    expect(events).toContainEqual({
      type: 'generated',
      result: expect.objectContaining({
        configDir: path.join(projectDir, '.agentconfig'),
        fileCount: 1,
        targets: ['copilot'],
      }),
    });
    expect(readText(projectDir, '.github/copilot-instructions.md')).toBe(
      'Always keep changes reviewable.',
    );
  });

  it('starts watch mode in core and emits watch events', async () => {
    const api = createAgentConfigApi(registerAll);
    const projectDir = createTempDir('agentconfig-run-generate-watch-');
    tempDirs.push(projectDir);
    const configDir = path.join(projectDir, '.agentconfig');
    const events: GenerateEvent[] = [];

    writeTree(projectDir, {
      '.agentconfig/config.yaml': ['version: 1', 'targets:', '  - copilot', ''].join('\n'),
      '.agentconfig/instructions/always-rule.md': 'Always keep changes reviewable.\n',
    });

    await api.generate({
      configPath: configDir,
      watch: true,
      onEvent: (event) => events.push(event),
    });

    expect(chokidarMock.watch).toHaveBeenCalledWith(configDir, { ignoreInitial: true });
    expect(chokidarMock.watcher.on).toHaveBeenCalledWith('add', expect.any(Function));
    expect(chokidarMock.watcher.on).toHaveBeenCalledWith('change', expect.any(Function));
    expect(chokidarMock.watcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
    expect(events).toContainEqual({
      type: 'watching',
      configDir,
    });
  });

  it('initializes from a project root', async () => {
    const api = createAgentConfigApi(registerAll);
    const projectDir = createTempDir('agentconfig-run-initialize-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.github/copilot-instructions.md': 'Always keep changes reviewable.\n',
    });

    const result = await api.initialize({
      projectRoot: projectDir,
      target: ['copilot'],
    });

    expect(result).toEqual(expect.objectContaining({
      configDir: path.join(projectDir, '.agentconfig'),
      instructionCount: 1,
      agentCount: 0,
    }));
    expect(readText(projectDir, '.agentconfig/instructions/copilot-instructions.md')).toContain(
      'Always keep changes reviewable.',
    );
  });

  it('rejects initialize when .agentconfig already exists', async () => {
    const api = createAgentConfigApi(registerAll);
    const projectDir = createTempDir('agentconfig-run-initialize-existing-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig/config.yaml': 'version: 1\n',
      '.github/copilot-instructions.md': 'Always keep changes reviewable.\n',
    });

    await expect(api.initialize({
      projectRoot: projectDir,
      target: ['copilot'],
    })).rejects.toThrow(`.agentconfig/ already exists at ${path.join(projectDir, '.agentconfig')}.`);
  });

  it('validates initialize source directory in core', async () => {
    const api = createAgentConfigApi(registerAll);
    const missingDir = path.join(createTempDir('agentconfig-run-initialize-missing-parent-'), 'missing');
    tempDirs.push(path.dirname(missingDir));

    await expect(api.initialize({
      projectRoot: missingDir,
      target: ['copilot'],
    })).rejects.toThrow(`Source directory not found: ${missingDir}`);
  });

  it('initializes to an explicit config directory', async () => {
    const api = createAgentConfigApi(registerAll);
    const projectDir = createTempDir('agentconfig-run-initialize-config-source-');
    const outputDir = createTempDir('agentconfig-run-initialize-config-output-');
    tempDirs.push(projectDir, outputDir);
    const configDir = path.join(outputDir, '.agentconfig');

    writeTree(projectDir, {
      '.github/copilot-instructions.md': 'Always keep changes reviewable.\n',
    });

    const result = await api.initialize({
      projectRoot: projectDir,
      configPath: configDir,
      target: ['copilot'],
    });

    expect(result.configDir).toBe(configDir);
    expect(readText(outputDir, '.agentconfig/instructions/copilot-instructions.md')).toContain(
      'Always keep changes reviewable.',
    );
  });

  it('translates agent-native files from one target to another', async () => {
    const api = createAgentConfigApi(registerAll);
    const projectDir = createTempDir('agentconfig-run-translate-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.github/copilot-instructions.md': 'Always keep changes reviewable.\n',
    });

    const result = await api.translate({
      projectRoot: projectDir,
      sourceTarget: 'copilot',
      destTarget: 'cursor',
    });

    expect(result).toEqual(expect.objectContaining({
      projectRoot: projectDir,
      sourceTarget: 'copilot',
      destTarget: 'cursor',
      instructionCount: 1,
      agentCount: 0,
      fileCount: 1,
    }));
    expect(readText(projectDir, '.cursor/rules/copilot-instructions.mdc')).toContain(
      'Always keep changes reviewable.',
    );
  });

  it('rejects translate when the project root does not exist', async () => {
    const api = createAgentConfigApi(registerAll);
    const missingDir = path.join(createTempDir('agentconfig-run-translate-missing-parent-'), 'missing');
    tempDirs.push(path.dirname(missingDir));

    await expect(api.translate({
      projectRoot: missingDir,
      sourceTarget: 'copilot',
      destTarget: 'cursor',
    })).rejects.toThrow(`Project root not found: ${missingDir}`);
  });
});
