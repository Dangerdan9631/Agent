import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  compareGlobalLinkedVersion,
  compareGlobalRemoteVersion,
  compareLocalToGlobalVersion,
  readGlobalInstallVersion,
} from '../../../../src/cli/ink/read-models/version-comparison.js';
import {
  installSourceMarkerRelativePath,
  readInstallSource,
} from '../../../../src/cli/ink/read-models/install-source.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-version-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
});

describe('readInstallSource', () => {
  it('returns remote when the build marker file is absent', () => {
    const cliDir = createTempDir('remote-cli');
    const markerPath = path.join(cliDir, installSourceMarkerRelativePath());

    const result = readInstallSource({ cliDirectory: cliDir });

    expect(result).toEqual({
      kind: 'remote',
      markerPath,
    });
  });

  it('returns local with source path when marker resolves to a readable package.json', () => {
    const packageRoot = createTempDir('linked-root');
    writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '1.2.3' }),
      'utf8',
    );

    const cliDir = createTempDir('linked-cli');
    const markerPath = path.join(cliDir, installSourceMarkerRelativePath());
    mkdirSync(path.dirname(markerPath), { recursive: true });
    writeFileSync(markerPath, `${packageRoot}\n`, 'utf8');

    const result = readInstallSource({ cliDirectory: cliDir });

    expect(result).toEqual({
      kind: 'local',
      sourcePath: packageRoot,
      markerPath,
    });
  });
});

describe('version comparison read model', () => {
  it('marks global remote installs up to date when registry latest matches current', async () => {
    const comparison = await compareGlobalRemoteVersion('1.0.0', {
      fetchNpmLatestVersion: async () => '1.0.0',
    });

    expect(comparison).toEqual({
      currentVersion: '1.0.0',
      latestLabel: 'Up to date',
      isUpToDate: true,
      comparisonTarget: 'npm-registry',
    });
  });

  it('reports newer linked-source semver for global local installs', async () => {
    const comparison = await compareGlobalLinkedVersion('1.0.0', '/linked/root', {
      readLinkedSourceVersion: () => '1.1.0',
    });

    expect(comparison).toEqual({
      currentVersion: '1.0.0',
      latestLabel: '1.1.0',
      isUpToDate: false,
      comparisonTarget: 'linked-source',
    });
  });

  it('compares local instance version against global install version', async () => {
    const comparison = await compareLocalToGlobalVersion('0.9.0', {
      readGlobalInstallVersion: () => '1.0.0',
    });

    expect(comparison).toEqual({
      currentVersion: '0.9.0',
      latestLabel: '1.0.0',
      isUpToDate: false,
      comparisonTarget: 'global-install',
    });
  });

  it('reads global install version from the adjacent toolkit package.json', () => {
    const cliDir = createTempDir('global-cli');
    const packageRoot = createTempDir('global-package');
    writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '2.3.4' }),
      'utf8',
    );
  writeFileSync(path.join(cliDir, '.source-package-root'), `${packageRoot}\n`, 'utf8');

    const version = readGlobalInstallVersion({ globalCliDirectory: cliDir });

    expect(version).toBe('2.3.4');
  });
});
