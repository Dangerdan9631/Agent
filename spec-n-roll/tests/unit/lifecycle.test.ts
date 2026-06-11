import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { CoreMutationError } from '../../src/core/errors.js';
import { readTaskSpecStatus, setTaskSpecStatus } from '../../src/core/task-lifecycle.js';

const tempDirs: string[] = [];

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

describe('task lifecycle', () => {
  it('sets Active status in spec.md frontmatter', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-lifecycle-${Date.now()}`);
    tempDirs.push(projectRoot);
    const specDir = path.join(projectRoot, 'specs', '001-demo');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(path.join(specDir, 'spec.md'), '# Demo\n', 'utf8');

    const result = await setTaskSpecStatus(projectRoot, '001', 'demo', 'Active');
    expect(result.status).toBe('Active');

    const content = readFileSync(path.join(specDir, 'spec.md'), 'utf8');
    expect(content).toContain('status: Active');
    expect(await readTaskSpecStatus(projectRoot, '001', 'demo')).toBe('Active');
  });

  it('rejects writes when status is Locked', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-locked-${Date.now()}`);
    tempDirs.push(projectRoot);
    const specDir = path.join(projectRoot, 'specs', '001-locked');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(path.join(specDir, 'spec.md'), '---\nstatus: Locked\n---\n\n# Locked\n', 'utf8');

    await expect(setTaskSpecStatus(projectRoot, '001', 'locked', 'Active')).rejects.toBeInstanceOf(
      CoreMutationError,
    );
  });
});
