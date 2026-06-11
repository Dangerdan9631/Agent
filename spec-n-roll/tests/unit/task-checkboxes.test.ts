import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { CoreMutationError } from '../../src/core/errors.js';
import { setTaskCheckboxes } from '../../src/core/task-checkboxes.js';

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

describe('setTaskCheckboxes', () => {
  it('updates multiple checkboxes in one write', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-checkboxes-${Date.now()}`);
    tempDirs.push(projectRoot);
    const specDir = path.join(projectRoot, 'specs', '001-demo');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(
      path.join(specDir, 'tasks.md'),
      ['- [ ] T001 First', '- [ ] T002 Second', '- [ ] T003 Third'].join('\n'),
      'utf8',
    );

    const result = await setTaskCheckboxes(projectRoot, '001', 'demo', ['T001', 'T003'], true);
    expect(result).toEqual([
      { taskId: 'T001', completed: true },
      { taskId: 'T003', completed: true },
    ]);

    const content = readFileSync(path.join(specDir, 'tasks.md'), 'utf8');
    expect(content).toContain('- [x] T001 First');
    expect(content).toContain('- [ ] T002 Second');
    expect(content).toContain('- [x] T003 Third');
  });

  it('fails without writing when any task id is missing', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-checkboxes-miss-${Date.now()}`);
    tempDirs.push(projectRoot);
    const specDir = path.join(projectRoot, 'specs', '001-demo');
    mkdirSync(specDir, { recursive: true });
    const tasksPath = path.join(specDir, 'tasks.md');
    writeFileSync(tasksPath, '- [ ] T001 First\n', 'utf8');

    await expect(
      setTaskCheckboxes(projectRoot, '001', 'demo', ['T001', 'T999'], true),
    ).rejects.toBeInstanceOf(CoreMutationError);

    expect(readFileSync(tasksPath, 'utf8')).toBe('- [ ] T001 First\n');
  });
});
