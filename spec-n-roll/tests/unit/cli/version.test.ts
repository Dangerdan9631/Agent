import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCliVersionReport } from '../../../src/cli/version-invocation.js';
import {
  formatVersionReport,
  readToolkitPackageVersion,
} from '../../../src/sdk/version.js';

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

/**
 * Writes a layout v1 local install with a bundled CLI entry and pinned package version.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param toolkitVersion - Semver written to `.spec-n-roll/cli/package.json`.
 * @returns Absolute paths for the launcher and bundled CLI entry.
 */
function writeLocalBundledInstall(
  projectRoot: string,
  toolkitVersion: string,
): { launcherPath: string; bundledEntryPath: string } {
  const cliRoot = path.join(projectRoot, '.spec-n-roll', 'cli');
  const bundledCliDir = path.join(cliRoot, 'dist', 'cli');
  const binDir = path.join(cliRoot, 'bin');
  mkdirSync(bundledCliDir, { recursive: true });
  mkdirSync(binDir, { recursive: true });

  const bundledEntryPath = path.join(bundledCliDir, 'index.js');
  writeFileSync(bundledEntryPath, 'export {};\n', 'utf8');
  writeFileSync(
    path.join(cliRoot, 'package.json'),
    JSON.stringify({ name: 'spec-n-roll', version: toolkitVersion, type: 'module' }),
    'utf8',
  );

  const launcherPath = path.join(binDir, 'spec-n-roll');
  writeFileSync(launcherPath, '#!/usr/bin/env node\nprocess.exit(0);\n', 'utf8');
  if (process.platform !== 'win32') {
    chmodSync(launcherPath, 0o755);
  }

  return { launcherPath, bundledEntryPath };
}

afterEach(() => {
  vi.unstubAllEnvs();
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

describe('readToolkitPackageVersion', () => {
  it('resolves version from local bundled package.json when startDir is the bundled CLI directory', () => {
    const projectRoot = createTempDir('local-package');
    const { bundledEntryPath } = writeLocalBundledInstall(projectRoot, '2.3.4-local');

    const version = readToolkitPackageVersion({
      startDir: path.dirname(bundledEntryPath),
    });

    expect(version).toBe('2.3.4-local');
    expect(
      JSON.parse(
        readFileSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'package.json'), 'utf8'),
      ),
    ).toMatchObject({ name: 'spec-n-roll', version: '2.3.4-local' });
  });

  it('prefers a built-version marker over a newer source package.json', () => {
    const packageRoot = createTempDir('built-marker-root');
    const cliDir = path.join(packageRoot, 'dist', 'cli');
    mkdirSync(cliDir, { recursive: true });
    writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '2.0.0-source', type: 'module' }),
      'utf8',
    );
    writeFileSync(path.join(cliDir, '.built-package-version'), '1.9.0-built\n', 'utf8');

    const version = readToolkitPackageVersion({ startDir: cliDir });

    expect(version).toBe('1.9.0-built');
  });
});

describe('buildVersionReport', () => {
  it('reports local toolkit version from bundled package.json when executed via local pin', () => {
    const projectRoot = createTempDir('local-report');
    const { bundledEntryPath, launcherPath } = writeLocalBundledInstall(
      projectRoot,
      '1.2.3-pinned',
    );

    vi.stubEnv('SPEC_N_ROLL_LOCAL_PIN', '1');
    vi.stubEnv('SPEC_N_ROLL_DISPATCHED', '1');
    vi.stubEnv('SPEC_N_ROLL_DISPATCHER_VERSION', '9.9.9-dispatcher');

    const report = buildCliVersionReport({
      cwd: projectRoot,
      executedBinaryPath: bundledEntryPath,
    });

    expect(report.toolkitVersion).toBe('1.2.3-pinned');
    expect(report.invocation).toBe('local');
    expect(report.localCliPath).toBe(path.resolve(launcherPath));
    expect(report.dispatcherVersion).toBe('9.9.9-dispatcher');
  });

  it('reports global invocation without local path when not pinned to a local bundle', () => {
    const projectRoot = createTempDir('global-report');
    writeLocalBundledInstall(projectRoot, '4.5.6-local');

    vi.stubEnv('SPEC_N_ROLL_LOCAL_PIN', undefined);
    vi.stubEnv('SPEC_N_ROLL_DISPATCHED', undefined);
    vi.stubEnv('SPEC_N_ROLL_DISPATCHER_VERSION', undefined);

    const globalCliPath = path.resolve('dist/cli/index.js');
    const report = buildCliVersionReport({
      cwd: projectRoot,
      executedBinaryPath: globalCliPath,
    });

    expect(report.invocation).toBe('global');
    expect(report.localCliPath).toBeUndefined();
    expect(report.dispatcherVersion).toBeUndefined();
  });
});

describe('formatVersionReport', () => {
  it('includes SC-005 fields for delegated local execution', () => {
    const localCliPath = path.join('/tmp/project', '.spec-n-roll', 'cli', 'bin', 'spec-n-roll');
    const output = formatVersionReport({
      toolkitVersion: '1.2.3-pinned',
      dispatcherVersion: '9.9.9-dispatcher',
      invocation: 'local',
      localCliPath,
    });

    expect(output).toContain('toolkit version: 1.2.3-pinned');
    expect(output).toContain('dispatcher version: 9.9.9-dispatcher');
    expect(output).toContain('invocation: local');
    expect(output).toContain(`local CLI path: ${localCliPath}`);
  });
});
