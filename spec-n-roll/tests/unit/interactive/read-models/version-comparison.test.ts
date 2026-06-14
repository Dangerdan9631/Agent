import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  compareGlobalLinkedVersion,
  compareGlobalRemoteVersion,
  compareLocalToGlobalVersion,
  isVersionNewer,
  readDelegatedDispatcherIsLinked,
  readDelegatedDispatcherVersion,
  readGlobalInstallVersion,
} from '../../../../src/cli/ink/read-models/version-comparison.js';
import {
  installSourceMarkerRelativePath,
  readInstallSource,
  readGlobalInstallSource,
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

describe('isVersionNewer', () => {
  it('returns true only when the candidate semver is strictly greater', () => {
    expect(isVersionNewer('1.1.0', '1.0.0')).toBe(true);
    expect(isVersionNewer('1.0.0', '1.0.0')).toBe(false);
    expect(isVersionNewer('1.0.0', '1.1.0')).toBe(false);
  });
});

describe('readGlobalInstallSource', () => {
  it('reads linked global install metadata from delegated dispatcher environment variables', () => {
    const result = readGlobalInstallSource({
      SPEC_N_ROLL_DISPATCHED: '1',
      SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: 'local',
      SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY: 'C:/global/dist/cli',
      SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH: 'C:/repo',
    });

    expect(result).toEqual({
      kind: 'local',
      sourcePath: path.resolve('C:/repo'),
      markerPath: path.join('C:/global/dist/cli', installSourceMarkerRelativePath()),
    });
  });

  it('reads remote global install metadata from delegated dispatcher environment variables', () => {
    const result = readGlobalInstallSource({
      SPEC_N_ROLL_DISPATCHED: '1',
      SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: 'remote',
      SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY: 'C:/global/dist/cli',
    });

    expect(result).toEqual({
      kind: 'remote',
      markerPath: path.join('C:/global/dist/cli', installSourceMarkerRelativePath()),
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

  it('reads global install version from the enclosing toolkit package.json', () => {
    const packageRoot = createTempDir('global-package');
    const cliDir = path.join(packageRoot, 'dist', 'cli');
    mkdirSync(cliDir, { recursive: true });
    writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '2.3.4' }),
      'utf8',
    );

    const version = readGlobalInstallVersion({ globalCliDirectory: cliDir });

    expect(version).toBe('2.3.4');
  });

  it('reads global install version from the built artifact marker before source package.json', () => {
    const packageRoot = createTempDir('global-built-package');
    const cliDir = path.join(packageRoot, 'dist', 'cli');
    mkdirSync(cliDir, { recursive: true });
    writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '2.4.0-source' }),
      'utf8',
    );
    writeFileSync(path.join(cliDir, '.built-package-version'), '2.3.4-built\n', 'utf8');

    const version = readGlobalInstallVersion({ globalCliDirectory: cliDir });

    expect(version).toBe('2.3.4-built');
  });

  it('prefers delegated dispatcher version for local-to-global comparisons', async () => {
    const comparison = await compareLocalToGlobalVersion('0.1.0', {
      readGlobalInstallVersion: () =>
        readDelegatedDispatcherVersion({
          SPEC_N_ROLL_DISPATCHED: '1',
          SPEC_N_ROLL_DISPATCHER_VERSION: '0.1.1',
        }),
    });

    expect(comparison).toEqual({
      currentVersion: '0.1.0',
      latestLabel: '0.1.1',
      isUpToDate: false,
      comparisonTarget: 'global-install',
    });
  });

  it('reads delegated dispatcher version before resolving global CLI from disk', () => {
    const version = readGlobalInstallVersion({
      env: {
        SPEC_N_ROLL_DISPATCHED: '1',
        SPEC_N_ROLL_DISPATCHER_VERSION: '0.1.1',
      },
    });

    expect(version).toBe('0.1.1');
  });

  it('detects delegated linked dispatcher installs from environment metadata', () => {
    expect(
      readDelegatedDispatcherIsLinked({
        SPEC_N_ROLL_DISPATCHED: '1',
        SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: 'local',
      }),
    ).toBe(true);
    expect(
      readDelegatedDispatcherIsLinked({
        SPEC_N_ROLL_DISPATCHED: '1',
        SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: 'remote',
      }),
    ).toBe(false);
  });
});
