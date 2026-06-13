import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadProjectHubView } from '../../../../src/cli/ink/read-models/project-hub.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-project-hub-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a task spec directory with optional lifecycle status frontmatter.
 *
 * @param projectRoot - Absolute project root directory.
 * @param taskSpecId - Zero-padded task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param status - Optional lifecycle status written to spec.md frontmatter.
 */
function writeTaskSpecFixture(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  status?: string,
): void {
  const specDir = path.join(projectRoot, 'specs', `${taskSpecId}-${slug}`);
  mkdirSync(specDir, { recursive: true });

  if (status != null) {
    writeFileSync(
      path.join(specDir, 'spec.md'),
      `---\nstatus: ${status}\n---\n\n# ${slug}\n`,
      'utf8',
    );
  }
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

describe('loadProjectHubView', () => {
  it('returns empty summary when no specs directory exists', async () => {
    const projectRoot = createTempDir('no-specs');

    const view = await loadProjectHubView({ projectRoot });

    expect(view.mostRecentSpec).toBeNull();
    expect(view.totalSpecCount).toBe(0);
    expect(view.statusCounts).toEqual({});
    expect(view.summaryBlock).toEqual([
      { label: 'Most recent spec', value: 'none' },
      { label: 'Total specs', value: '0' },
    ]);
  });

  it('selects the recognized spec with the highest numeric id as most recent', async () => {
    const projectRoot = createTempDir('most-recent');
    writeTaskSpecFixture(projectRoot, '001', 'first-feature', 'Active');
    writeTaskSpecFixture(projectRoot, '003', 'latest-feature', 'Complete');
    writeTaskSpecFixture(projectRoot, '002', 'middle-feature', 'Active');

    const view = await loadProjectHubView({ projectRoot });

    expect(view.mostRecentSpec).toEqual({
      directoryName: '003-latest-feature',
      taskSpecId: '003',
      slug: 'latest-feature',
      lifecycleStatus: 'Complete',
      operationalStatus: 'missing',
    });
    expect(view.totalSpecCount).toBe(3);
  });

  it('aggregates lifecycle status counts for recognized specs only', async () => {
    const projectRoot = createTempDir('status-counts');
    writeTaskSpecFixture(projectRoot, '001', 'active-one', 'Active');
    writeTaskSpecFixture(projectRoot, '002', 'active-two', 'Active');
    writeTaskSpecFixture(projectRoot, '003', 'complete-one', 'Complete');
    writeTaskSpecFixture(projectRoot, '004', 'locked-one', 'Locked');
    writeTaskSpecFixture(projectRoot, '005', 'missing-status');
    mkdirSync(path.join(projectRoot, 'specs', 'not-a-spec'), { recursive: true });

    const view = await loadProjectHubView({ projectRoot });

    expect(view.statusCounts).toEqual({
      Active: 2,
      Complete: 1,
      Locked: 1,
      unknown: 1,
    });
    expect(view.totalSpecCount).toBe(5);
  });

  it('builds summary block with most recent spec label and per-status counts', async () => {
    const projectRoot = createTempDir('summary-block');
    writeTaskSpecFixture(projectRoot, '001', 'older', 'Active');
    writeTaskSpecFixture(projectRoot, '002', 'newer', 'Complete');

    const view = await loadProjectHubView({ projectRoot });

    expect(view.summaryBlock).toEqual([
      { label: 'Most recent spec', value: '002-newer (Complete)' },
      { label: 'Active', value: '1' },
      { label: 'Complete', value: '1' },
      { label: 'Total specs', value: '2' },
    ]);
  });
});
