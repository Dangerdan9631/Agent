import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findConfigDir, loadConfig, resolveConfigDir } from '../../src/config';
import { createTempDir, removeDir, writeTree } from '../test-utils';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    removeDir(tempDirs.pop() as string);
  }
});

describe('config helpers', () => {
  it('finds the nearest .agentconfig directory', () => {
    const projectDir = createTempDir('agentconfig-config-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig/config.yaml': 'version: 1\n',
      'packages/core/src/example.ts': 'export const value = 1;\n',
    });

    const nestedDir = path.join(projectDir, 'packages', 'core', 'src');
    expect(findConfigDir(nestedDir)).toBe(path.join(projectDir, '.agentconfig'));
  });

  it('throws when no .agentconfig directory can be found', () => {
    const rootDir = path.parse(process.cwd()).root;

    expect(() => resolveConfigDir(rootDir)).toThrow(/No \.agentconfig\//);
  });

  it('returns null when no .agentconfig directory exists while walking upward', () => {
    const rootDir = path.parse(process.cwd()).root;

    expect(findConfigDir(rootDir)).toBeNull();
  });

  it('ignores .agentconfig paths that are files instead of directories', () => {
    const projectDir = fs.mkdtempSync(
      path.join(path.parse(process.cwd()).root, 'agentconfig-file-instead-of-dir-'),
    );
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig': 'not a directory\n',
    });

    expect(findConfigDir(projectDir)).toBeNull();
  });

  it('uses the current working directory when resolveConfigDir has no argument', () => {
    const projectDir = createTempDir('agentconfig-resolve-cwd-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig/config.yaml': 'version: 1\n',
    });

    const previousCwd = process.cwd();
    process.chdir(projectDir);

    try {
      expect(resolveConfigDir()).toBe(path.join(projectDir, '.agentconfig'));
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('loads config values from config.yaml', async () => {
    const projectDir = createTempDir('agentconfig-load-config-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig/config.yaml': [
        'version: 1',
        'targets:',
        '  - copilot',
        'options:',
        '  output_dir: generated',
        '',
      ].join('\n'),
    });

    const config = await loadConfig(path.join(projectDir, '.agentconfig'));

    expect(config).toEqual({
      version: 1,
      targets: ['copilot'],
      options: {
        output_dir: 'generated',
      },
    });
  });

  it('applies overrides on top of config.yaml values', async () => {
    const projectDir = createTempDir('agentconfig-load-overrides-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig/config.yaml': [
        'version: 1',
        'targets:',
        '  - copilot',
        'options:',
        '  output_dir: generated',
        '',
      ].join('\n'),
    });

    const config = await loadConfig(path.join(projectDir, '.agentconfig'), {
      options: {
        output_dir: 'preview',
      },
    });

    expect(config).toEqual({
      version: 1,
      targets: ['copilot'],
      options: {
        output_dir: 'preview',
      },
    });
  });

  it('returns schema defaults when config.yaml is missing', async () => {
    const projectDir = createTempDir('agentconfig-load-defaults-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig/.gitkeep': '',
    });

    const config = await loadConfig(path.join(projectDir, '.agentconfig'));

    expect(config).toEqual({
      version: 1,
      targets: [],
      options: {
        output_dir: '.',
      },
    });
  });

  it('treats empty config.yaml files as empty objects', async () => {
    const projectDir = createTempDir('agentconfig-empty-config-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.agentconfig/config.yaml': '',
    });

    const config = await loadConfig(path.join(projectDir, '.agentconfig'));

    expect(config).toEqual({
      version: 1,
      targets: [],
      options: {
        output_dir: '.',
      },
    });
  });
});
