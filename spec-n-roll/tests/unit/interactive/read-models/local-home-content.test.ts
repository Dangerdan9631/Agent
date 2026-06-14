import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadLocalHomeContent } from '../../../../src/cli/ink/read-models/local-home-content.js';
import { writeTaskMetadata } from '../../../../src/core/task-metadata.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-local-home-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes project metadata JSON for local home read-model tests.
 *
 * @param projectRoot - Absolute project root directory.
 * @param metadata - Project metadata fields to persist.
 */
function writeProjectMetadataFixture(projectRoot: string, metadata: Record<string, unknown>): void {
  const configDir = path.join(projectRoot, '.spec-n-roll', 'config');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    path.join(configDir, 'project-metadata.json'),
    JSON.stringify({
      schemaVersion: '1',
      ...metadata,
    }),
    'utf8',
  );
}

/**
 * Writes workflow state JSON for a task spec directory.
 *
 * @param projectRoot - Absolute project root directory.
 * @param taskSpecId - Zero-padded task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param state - Workflow state fields to persist.
 */
function writeWorkflowStateFixture(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  state: Record<string, unknown>,
): void {
  const specDir = path.join(projectRoot, 'specs', `${taskSpecId}-${slug}`);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, 'workflow-state.json'),
    JSON.stringify({
      schemaVersion: '1',
      taskSpecId,
      slug,
      ...state,
    }),
    'utf8',
  );
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

describe('loadLocalHomeContent', () => {
  it('loads version block comparing local install to global', async () => {
    const projectRoot = createTempDir('version-block');

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.versionBlock).toEqual([
      { label: 'Version', value: 'v1.0.0 (local)' },
      { label: 'Latest Version', value: 'Up to date' },
      { label: 'Project', value: projectRoot },
    ]);
    expect(content.versionComparison.isUpToDate).toBe(true);
  });

  it('includes task summary block when project metadata is readable', async () => {
    const projectRoot = createTempDir('task-summary');
    writeProjectMetadataFixture(projectRoot, {
      nextTaskSpecId: 3,
      currentTaskSpecId: '001',
      currentTaskSlug: 'active-checkout',
      updatedAt: '2026-06-13T08:00:00.000Z',
    });

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.taskSummaryBlock).toEqual([
      { label: 'Next task spec id', value: '3' },
      { label: 'Updated at', value: '08:00:00 2026-06-13' },
    ]);
  });

  it('includes current task block with timestamps from task metadata', async () => {
    const projectRoot = createTempDir('current-task');
    writeProjectMetadataFixture(projectRoot, {
      nextTaskSpecId: 3,
      currentTaskSpecId: '001',
      currentTaskSlug: 'active-checkout',
      implementationStartedAt: '2026-06-13T09:00:00.000Z',
      updatedAt: '2026-06-13T08:00:00.000Z',
    });
    writeWorkflowStateFixture(projectRoot, '001', 'active-checkout', {
      workflowVariantId: 'quick',
      lastCompletedStepId: 'tasks',
      status: 'active',
      currentStepId: 'implement',
      updatedAt: '2026-06-13T08:05:00.000Z',
    });
    await writeTaskMetadata(projectRoot, '001', 'active-checkout', {
      createdAt: '2026-06-13T07:30:00.000Z',
      implementationStartedAt: '2026-06-13T08:15:00.000Z',
    });

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.currentTaskBlock).toEqual([
      { label: 'Current task', value: '001 Active Checkout' },
      { label: 'Created at', value: '07:30:00 2026-06-13' },
      { label: 'Implementation started at', value: '08:15:00 2026-06-13' },
    ]);
  });

  it('omits current task block when implement is complete', async () => {
    const projectRoot = createTempDir('implement-complete');
    writeProjectMetadataFixture(projectRoot, {
      nextTaskSpecId: 3,
      currentTaskSpecId: '002',
      currentTaskSlug: 'completed-migration',
      updatedAt: '2026-06-13T08:00:00.000Z',
    });
    writeWorkflowStateFixture(projectRoot, '002', 'completed-migration', {
      workflowVariantId: 'full',
      lastCompletedStepId: 'implement',
      status: 'complete',
      currentStepId: null,
      updatedAt: '2026-06-13T08:10:00.000Z',
    });
    await writeTaskMetadata(projectRoot, '002', 'completed-migration', {
      createdAt: '2026-06-13T07:00:00.000Z',
      implementationStartedAt: '2026-06-13T07:30:00.000Z',
    });

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.currentTaskBlock).toBeNull();
  });

  it('omits current task block when no current task is set', async () => {
    const projectRoot = createTempDir('no-current-task');
    writeProjectMetadataFixture(projectRoot, {
      nextTaskSpecId: 1,
      currentTaskSpecId: null,
      currentTaskSlug: null,
      updatedAt: '2026-06-13T08:00:00.000Z',
    });

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.currentTaskBlock).toBeNull();
  });

  it('ignores legacy project metadata timestamp fields for current task display', async () => {
    const projectRoot = createTempDir('ignore-legacy-timestamps');
    writeProjectMetadataFixture(projectRoot, {
      nextTaskSpecId: 2,
      currentTaskSpecId: '001',
      currentTaskSlug: 'active-checkout',
      implementationStartedAt: '2026-06-13T09:00:00.000Z',
      updatedAt: '2026-06-13T08:00:00.000Z',
    });
    writeWorkflowStateFixture(projectRoot, '001', 'active-checkout', {
      workflowVariantId: 'quick',
      lastCompletedStepId: 'tasks',
      status: 'active',
      currentStepId: 'implement',
      updatedAt: '2026-06-13T08:05:00.000Z',
    });
    await writeTaskMetadata(projectRoot, '001', 'active-checkout', {
      createdAt: '2026-06-13T07:30:00.000Z',
      implementationStartedAt: '2026-06-13T08:15:00.000Z',
    });

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.currentTaskBlock).toEqual([
      { label: 'Current task', value: '001 Active Checkout' },
      { label: 'Created at', value: '07:30:00 2026-06-13' },
      { label: 'Implementation started at', value: '08:15:00 2026-06-13' },
    ]);
    expect(content.currentTaskBlock).not.toContainEqual({
      label: 'Implementation started at',
      value: '09:00:00 2026-06-13',
    });
  });

  it('omits implementation started line when absent from task metadata', async () => {
    const projectRoot = createTempDir('no-impl-started');
    writeProjectMetadataFixture(projectRoot, {
      nextTaskSpecId: 2,
      currentTaskSpecId: '001',
      currentTaskSlug: 'active-checkout',
      implementationStartedAt: '2026-06-13T09:00:00.000Z',
      updatedAt: '2026-06-13T08:00:00.000Z',
    });
    writeWorkflowStateFixture(projectRoot, '001', 'active-checkout', {
      workflowVariantId: 'quick',
      lastCompletedStepId: 'tasks',
      status: 'active',
      currentStepId: 'implement',
      updatedAt: '2026-06-13T08:05:00.000Z',
    });
    await writeTaskMetadata(projectRoot, '001', 'active-checkout', {
      createdAt: '2026-06-13T07:30:00.000Z',
    });

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.currentTaskBlock).toEqual([
      { label: 'Current task', value: '001 Active Checkout' },
      { label: 'Created at', value: '07:30:00 2026-06-13' },
    ]);
  });

  it('returns null task summary block when project metadata is absent', async () => {
    const projectRoot = createTempDir('no-metadata');

    const content = await loadLocalHomeContent(
      { projectRoot },
      {
        readCurrentVersion: () => '1.0.0',
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.taskSummaryBlock).toBeNull();
    expect(content.currentTaskBlock).toBeNull();
  });
});
