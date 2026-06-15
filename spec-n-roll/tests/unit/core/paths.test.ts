import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { findToolkitPackageRoot } from '../../../src/sdk/core/paths.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-paths-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
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

describe('findToolkitPackageRoot', () => {
  it('resolves the local install package.json from a bundled CLI entry directory', () => {
    const projectRoot = createTempDir('project');
    const cliRoot = path.join(projectRoot, '.spec-n-roll', 'cli');
    const bundledCliDir = path.join(cliRoot, 'dist', 'cli');
    mkdirSync(bundledCliDir, { recursive: true });
    writeFileSync(path.join(bundledCliDir, 'index.js'), 'export {};\n', 'utf8');
    writeFileSync(
      path.join(cliRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '3.4.5' }),
      'utf8',
    );

    const resolved = findToolkitPackageRoot(bundledCliDir);

    expect(resolved).toBe(cliRoot);
    expect(JSON.parse(readFileSync(path.join(resolved, 'package.json'), 'utf8'))).toEqual({
      name: 'spec-n-roll',
      version: '3.4.5',
    });
  });

  it('continues resolving to the toolkit package root for global installs', () => {
    const toolkitRoot = createTempDir('global-toolkit');
    const distCliDir = path.join(toolkitRoot, 'dist', 'cli');
    mkdirSync(distCliDir, { recursive: true });
    writeFileSync(path.join(distCliDir, 'index.js'), 'export {};\n', 'utf8');
    writeFileSync(
      path.join(toolkitRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '0.1.0' }),
      'utf8',
    );

    expect(findToolkitPackageRoot(distCliDir)).toBe(toolkitRoot);
  });
});
