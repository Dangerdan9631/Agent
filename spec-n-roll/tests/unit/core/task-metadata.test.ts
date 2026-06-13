import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  readTaskMetadata,
  taskMetadataPath,
  writeTaskMetadata,
} from '../../../src/core/task-metadata.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project root tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created project root.
 */
function createProjectRoot(suffix: string): string {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-task-metadata-${suffix}-${Date.now()}`);
  mkdirSync(projectRoot, { recursive: true });
  tempDirs.push(projectRoot);
  return projectRoot;
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

describe('task metadata', () => {
  it('resolves the per-task metadata path under the task spec directory', () => {
    const projectRoot = createProjectRoot('path');
    const metadataPath = taskMetadataPath(projectRoot, '001', 'demo-feature');

    expect(metadataPath).toBe(
      path.join(projectRoot, 'specs', '001-demo-feature', '.spec-n-roll', 'task-metadata.json'),
    );
  });

  it('returns null when task metadata has not been written yet', async () => {
    const projectRoot = createProjectRoot('missing');
    const metadata = await readTaskMetadata(projectRoot, '001', 'demo-feature');

    expect(metadata).toBeNull();
  });

  it('writes and reads createdAt and implementationStartedAt timestamps', async () => {
    const projectRoot = createProjectRoot('roundtrip');
    const createdAt = '2026-06-13T10:00:00.000Z';
    const implementationStartedAt = '2026-06-13T11:30:00.000Z';

    await writeTaskMetadata(projectRoot, '002', 'checkout-flow', { createdAt });
    await writeTaskMetadata(projectRoot, '002', 'checkout-flow', { implementationStartedAt });

    const metadata = await readTaskMetadata(projectRoot, '002', 'checkout-flow');
    const filePath = taskMetadataPath(projectRoot, '002', 'checkout-flow');

    expect(existsSync(filePath)).toBe(true);
    expect(metadata).toEqual({ createdAt, implementationStartedAt });
    expect(JSON.parse(readFileSync(filePath, 'utf8'))).toEqual({
      createdAt,
      implementationStartedAt,
    });
  });

  it('merges partial updates without dropping existing fields', async () => {
    const projectRoot = createProjectRoot('merge');
    const createdAt = '2026-06-13T09:00:00.000Z';

    await writeTaskMetadata(projectRoot, '003', 'merge-task', { createdAt });
    await writeTaskMetadata(projectRoot, '003', 'merge-task', {
      implementationStartedAt: '2026-06-13T12:00:00.000Z',
    });

    const metadata = await readTaskMetadata(projectRoot, '003', 'merge-task');

    expect(metadata).toEqual({
      createdAt,
      implementationStartedAt: '2026-06-13T12:00:00.000Z',
    });
  });
});
