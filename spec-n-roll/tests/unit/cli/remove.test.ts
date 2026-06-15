import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runInit } from '../../../src/sdk/init.js';
import { runProjectRemove } from '../../../src/sdk/remove.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created project root.
 */
function createTempProject(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-remove-${suffix}-${Date.now()}`);
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

describe('runProjectRemove', () => {
  it('requires confirmation unless --yes is provided', async () => {
    const projectRoot = createTempProject('confirm');
    await runInit({ projectRoot, agents: ['cursor'] });

    await expect(
      runProjectRemove({
        projectRoot,
        skipConfirmation: false,
        confirm: async () => false,
      }),
    ).rejects.toThrow(/cancel/i);

    expect(
      existsSync(path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json')),
    ).toBe(true);
  });

  it('removes managed toolkit files while preserving user-owned specs content', async () => {
    const projectRoot = createTempProject('managed');
    await runInit({ projectRoot, agents: ['cursor'] });

    const specsDir = path.join(projectRoot, 'specs', '001-demo');
    mkdirSync(specsDir, { recursive: true });
    const specFile = path.join(specsDir, 'spec.md');
    writeFileSync(specFile, '# Demo spec\n', 'utf8');

    const result = await runProjectRemove({
      projectRoot,
      skipConfirmation: true,
    });

    expect(result.projectRoot).toBe(path.resolve(projectRoot));
    expect(result.removedPaths.length).toBeGreaterThan(0);
    expect(existsSync(path.join(projectRoot, '.spec-n-roll'))).toBe(false);
    expect(existsSync(specFile)).toBe(true);
    expect(readFileSync(specFile, 'utf8')).toBe('# Demo spec\n');
  });

  it('rejects removal when the project is not initialized', async () => {
    const projectRoot = createTempProject('uninitialized');

    await expect(
      runProjectRemove({
        projectRoot,
        skipConfirmation: true,
      }),
    ).rejects.toThrow(/not initialized/i);
  });
});
