import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  loadGlobalHomeContent,
  readLocalProjectPackageVersion,
} from '../../../../src/ink/read-models/global-home-content.js';

/**
 * Temporary project directories created by global home read-model tests.
 */
const tempDirs: string[] = [];

/**
 * Creates a temporary project root and tracks it for cleanup.
 *
 * @param suffix - Unique suffix describing the test fixture purpose.
 * @returns Absolute path to the created project root.
 */
function createTempProject(suffix: string): string {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-global-home-${suffix}-${Date.now()}`);
  mkdirSync(projectRoot, { recursive: true });
  tempDirs.push(projectRoot);
  return projectRoot;
}

/**
 * Writes the project-local CLI package descriptor for version display tests.
 *
 * @param projectRoot - Absolute project root receiving `.spec-n-roll/cli/package.json`.
 * @param version - Semver string to write into the local package descriptor.
 */
function writeLocalPackageVersion(projectRoot: string, version: string): void {
  const cliRoot = path.join(projectRoot, '.spec-n-roll', 'cli');
  mkdirSync(cliRoot, { recursive: true });
  writeFileSync(
    path.join(cliRoot, 'package.json'),
    JSON.stringify({ name: 'spec-n-roll', version, type: 'module' }),
    'utf8',
  );
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('readLocalProjectPackageVersion', () => {
  it('reads the version from a valid project-local package descriptor', () => {
    const projectRoot = createTempProject('local-package');
    writeLocalPackageVersion(projectRoot, '2.3.4');

    expect(readLocalProjectPackageVersion(projectRoot)).toBe('2.3.4');
  });

  it('returns null when no project-local package descriptor exists', () => {
    const projectRoot = createTempProject('no-local-package');

    expect(readLocalProjectPackageVersion(projectRoot)).toBeNull();
  });
});

describe('loadGlobalHomeContent', () => {
  it('shows global and local versions in the content area', async () => {
    const projectRoot = createTempProject('project-version');
    writeLocalPackageVersion(projectRoot, '2.3.4');

    const content = await loadGlobalHomeContent(
      {
        projectRoot,
        isInitialized: true,
      },
      {
        readInstallSource: () => ({ kind: 'remote', markerPath: '/tmp/marker' }),
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          fetchNpmLatestVersion: async () => '1.0.0',
        },
      },
    );

    expect(content.fields).toEqual([
      { label: 'Install Source', value: 'Remote' },
      { label: 'Global Version', value: 'v1.0.0' },
      { label: 'Local Version', value: 'v2.3.4' },
      { label: 'Project', value: projectRoot },
      { label: 'Project Status', value: 'Initialized' },
    ]);
  });

  it('disables global update when npm registry is not newer', async () => {
    const content = await loadGlobalHomeContent(
      {
        projectRoot: createTempProject('global-up-to-date'),
        isInitialized: false,
      },
      {
        readInstallSource: () => ({ kind: 'remote', markerPath: '/tmp/marker' }),
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          fetchNpmLatestVersion: async () => '1.0.0',
        },
      },
    );

    expect(content.updateGlobalDisabled).toBe(true);
  });

  it('enables global update when npm registry is newer', async () => {
    const content = await loadGlobalHomeContent(
      {
        projectRoot: createTempProject('global-newer-npm'),
        isInitialized: false,
      },
      {
        readInstallSource: () => ({ kind: 'remote', markerPath: '/tmp/marker' }),
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          fetchNpmLatestVersion: async () => '1.1.0',
        },
      },
    );

    expect(content.updateGlobalDisabled).toBe(false);
  });

  it('always enables global update for linked installs', async () => {
    const content = await loadGlobalHomeContent(
      {
        projectRoot: createTempProject('global-linked'),
        isInitialized: false,
      },
      {
        readInstallSource: () => ({
          kind: 'local',
          sourcePath: '/repo',
          markerPath: '/tmp/marker',
        }),
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readLinkedSourceVersion: () => '1.0.0',
        },
      },
    );

    expect(content.updateGlobalDisabled).toBe(false);
  });
});
