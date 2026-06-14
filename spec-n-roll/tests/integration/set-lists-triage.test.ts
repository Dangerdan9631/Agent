import os from 'node:os';
import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultWorkflowConfig } from '../../src/cli/commands/init.js';
import { atomicWriteJson } from '../../src/core/atomic-write.js';
import {
  createDefaultSetListsFile,
  evaluateSetListTriage,
  readSetListsFile,
  updateSetList,
} from '../../src/setlists/index.js';
import { assessTriage } from '../../src/specs/triage.js';
import { migrateSetListsIfMissing } from '../../src/updates/migration.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../../src/workflow/artifacts.js';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fse.remove(root)));
});

/**
 * Creates a temporary initialized project root for set list triage integration tests.
 *
 * @returns Absolute path to the temporary project root.
 */
async function createProjectRoot(): Promise<string> {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-set-lists-triage-${Date.now()}`);
  tempRoots.push(projectRoot);
  await fse.ensureDir(path.join(projectRoot, '.spec-n-roll', 'config'));

  const workflowConfig = createDefaultWorkflowConfig({
    toolkitVersion: '0.1.2',
    selectedAgentIds: ['cursor'],
  });
  await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), workflowConfig);
  await atomicWriteJson(
    path.join(projectRoot, '.spec-n-roll/config/set-lists.json'),
    createDefaultSetListsFile(),
  );

  return projectRoot;
}

describe('set lists triage integration', () => {
  it('selects lowest priority when triage is ambiguous between enabled lists', async () => {
    const projectRoot = await createProjectRoot();
    await updateSetList(projectRoot, 'quick', {
      description: 'Small features with specify, tasks, and implement',
    });
    await updateSetList(projectRoot, 'full', {
      description: 'Small features with specify, tasks, and implement',
      priority: 5,
    });

    const file = await readSetListsFile(projectRoot);
    const enabled = file?.setLists.filter((entry) => entry.enabled) ?? [];

    const result = evaluateSetListTriage({
      userIntent: 'Add a new feature with specify and tasks',
      eligibleSetLists: enabled,
    });

    expect(result.ambiguous).toBe(true);
    expect(result.selectionReason).toBe('priority-tie-break');
    expect(result.selectedId).toBe('quick');
  });

  it('migrates missing set-lists.json from workflow.config.json workflows', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-set-lists-migrate-${Date.now()}`);
    tempRoots.push(projectRoot);
    await fse.ensureDir(path.join(projectRoot, '.spec-n-roll', 'config'));

    const workflowConfig = createDefaultWorkflowConfig({
      toolkitVersion: '0.1.2',
      selectedAgentIds: ['cursor'],
    });
    await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), workflowConfig);

    const migrated = await migrateSetListsIfMissing(projectRoot);
    expect(migrated?.file.setLists).toHaveLength(3);
    expect(migrated?.diagnostic.toLowerCase()).toContain('set list');

    const reread = await readSetListsFile(projectRoot);
    expect(reread?.setLists.map((entry) => entry.id)).toEqual(['papercut', 'quick', 'full']);
  });

  it('blocks triage when no enabled set lists remain', async () => {
    const projectRoot = await createProjectRoot();
    const file = await readSetListsFile(projectRoot);
    expect(file).not.toBeNull();

    await atomicWriteJson(path.join(projectRoot, '.spec-n-roll/config/set-lists.json'), {
      ...file!,
      setLists: file!.setLists.map((entry) => ({ ...entry, enabled: false })),
    });

    const reread = await readSetListsFile(projectRoot);
    const enabled = reread?.setLists.filter((entry) => entry.enabled) ?? [];

    const result = evaluateSetListTriage({
      userIntent: 'Fix typo in readme',
      eligibleSetLists: enabled,
    });

    expect(result.blocking).toBe(true);
    expect(result.selectedId).toBeNull();
    expect(result.message).toMatch(/enabled set list/i);

    const assessment = assessTriage({
      description: 'Fix typo in readme',
      defaultWorkflowId: 'quick',
      availableWorkflowIds: ['papercut', 'quick', 'full'],
      enabledSetLists: enabled,
    });

    expect(assessment.mode).toBe('blocking');
    expect(assessment.blocking).toBe(true);
    expect(assessment.proposedSetListId).toBeNull();
  });
});
