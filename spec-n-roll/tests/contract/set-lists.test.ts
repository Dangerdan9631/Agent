import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import fse from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import { runInit } from '../../src/cli/commands/init.js';
import { loadSetListReadResult } from '../../src/cli/commands/set-list.js';
import { executeSetListRead, executeSetListTriage } from '../../src/mcp/set-list-tool-handlers.js';
import {
  createDefaultSetListsFile,
  disableSetList,
  enableSetList,
  evaluateSetListTriage,
  readSetListsFile,
  runSetListTriage,
  validateSetListsFile,
} from '../../src/setlists/index.js';

const tempRoots: string[] = [];
const cliPath = path.resolve('dist/cli/index.js');

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fse.remove(root)));
});

/**
 * Creates a temporary project root for set list contract tests.
 *
 * @returns Absolute path to the temporary project root.
 */
async function createTempProjectRoot(): Promise<string> {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-set-lists-contract-${Date.now()}`);
  tempRoots.push(projectRoot);
  await fse.ensureDir(projectRoot);
  return projectRoot;
}

/**
 * Runs a CLI subcommand in a project directory and returns parsed JSON stdout.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the script path.
 * @returns Parsed JSON object from stdout.
 */
function runCliJson(projectRoot: string, args: string[]): unknown {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as unknown;
}

/**
 * Runs a CLI subcommand expecting a non-zero exit code.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the script path.
 * @returns Child process result with stderr text.
 */
function runCliExpectFailure(projectRoot: string, args: string[]) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect(result.status).not.toBe(0);
  return result;
}

describe('set lists contract', () => {
  it('fresh init seeds papercut, quick, and full as ordinary data entries', async () => {
    const projectRoot = await createTempProjectRoot();

    await runInit({ projectRoot, agents: ['cursor'] });

    const file = await readSetListsFile(projectRoot);
    expect(file?.schemaVersion).toBe(1);
    expect(file?.setLists).toHaveLength(3);
    expect(file?.setLists.map((entry) => entry.id)).toEqual(['papercut', 'quick', 'full']);
    expect(file?.setLists.every((entry) => entry.enabled)).toBe(true);
    expect(file?.setLists.every((entry) => entry.workflowId === entry.id)).toBe(true);
  });

  it('disabled set lists are excluded from triage evaluation', async () => {
    const projectRoot = await createTempProjectRoot();
    await runInit({ projectRoot, agents: ['cursor'] });
    await disableSetList(projectRoot, 'quick');

    const file = await readSetListsFile(projectRoot);
    const enabled = file?.setLists.filter((entry) => entry.enabled) ?? [];

    const result = evaluateSetListTriage({
      userIntent: 'Add email notification when an order ships',
      eligibleSetLists: enabled,
    });

    expect(result.blocking).toBe(false);
    expect(result.eligible.map((entry) => entry.id)).not.toContain('quick');
    expect(result.eligible.map((entry) => entry.id)).toEqual(['papercut', 'full']);
    expect(result.selectedId).not.toBe('quick');
  });

  it('set-list CLI list/show/create/update/enable/disable/remove/validate commands', async () => {
    const projectRoot = await createTempProjectRoot();
    await runInit({ projectRoot, agents: ['cursor'] });

    const fromCliList = runCliJson(projectRoot, ['set-list', 'list']) as {
      setListsFile: { setLists: { id: string }[] };
    };
    const fromCoreList = await loadSetListReadResult(projectRoot, {});
    expect(fromCliList).toEqual(fromCoreList);
    expect(fromCliList.setListsFile.setLists).toHaveLength(3);

    const fromCliShow = runCliJson(projectRoot, ['set-list', 'show', 'quick']) as {
      setList: { id: string };
    };
    const fromCoreShow = await loadSetListReadResult(projectRoot, { id: 'quick' });
    expect(fromCliShow).toEqual(fromCoreShow);
    expect(fromCliShow.setList.id).toBe('quick');

    const created = runCliJson(projectRoot, [
      'set-list',
      'create',
      '--id',
      'custom',
      '--name',
      'Custom',
      '--description',
      'Custom scoped feature work',
      '--workflow-id',
      'quick',
      '--priority',
      '4',
    ]) as { setListsFile: { setLists: { id: string }[] } };
    expect(created.setListsFile.setLists.map((entry) => entry.id)).toContain('custom');

    const updated = runCliJson(projectRoot, [
      'set-list',
      'update',
      'custom',
      '--name',
      'Custom Updated',
    ]) as { setListsFile: { setLists: { id: string; name: string }[] } };
    expect(updated.setListsFile.setLists.find((entry) => entry.id === 'custom')?.name).toBe(
      'Custom Updated',
    );

    const disabled = runCliJson(projectRoot, ['set-list', 'disable', 'custom']) as {
      setListsFile: { setLists: { id: string; enabled: boolean }[] };
    };
    expect(disabled.setListsFile.setLists.find((entry) => entry.id === 'custom')?.enabled).toBe(
      false,
    );

    const enabled = runCliJson(projectRoot, ['set-list', 'enable', 'custom']) as {
      setListsFile: { setLists: { id: string; enabled: boolean }[] };
    };
    expect(enabled.setListsFile.setLists.find((entry) => entry.id === 'custom')?.enabled).toBe(
      true,
    );

    const removed = runCliJson(projectRoot, ['set-list', 'remove', 'custom']) as {
      setListsFile: { setLists: { id: string }[] };
    };
    expect(removed.setListsFile.setLists.map((entry) => entry.id)).not.toContain('custom');

    const validated = runCliJson(projectRoot, ['set-list', 'validate']) as {
      valid: boolean;
      errors: string[];
    };
    const fromCoreValidate = await validateSetListsFile(projectRoot);
    expect(validated).toEqual(fromCoreValidate);
    expect(validated.valid).toBe(true);

    await disableSetList(projectRoot, 'quick');
    await disableSetList(projectRoot, 'full');
    const disableLast = runCliExpectFailure(projectRoot, ['set-list', 'disable', 'papercut']);
    expect(disableLast.stderr).toContain('last enabled');

    await enableSetList(projectRoot, 'quick');
    await enableSetList(projectRoot, 'full');
  }, 30_000);

  it('set_list_read and set_list_triage MCP tools mirror CLI validation', async () => {
    const projectRoot = await createTempProjectRoot();
    await runInit({ projectRoot, agents: ['cursor'] });

    const fromCliList = runCliJson(projectRoot, ['set-list', 'list']);
    const fromMcpList = await executeSetListRead(projectRoot, {});
    expect(fromMcpList).toEqual(fromCliList);

    const fromCliShow = runCliJson(projectRoot, ['set-list', 'show', 'papercut']);
    const fromMcpShow = await executeSetListRead(projectRoot, { id: 'papercut' });
    expect(fromMcpShow).toEqual(fromCliShow);

    const intent = 'fix typo in readme label copy';
    const fromCliTriage = runCliJson(projectRoot, ['set-list', 'triage', '--intent', intent]);
    const fromMcpTriage = await executeSetListTriage(projectRoot, { userIntent: intent });
    expect(fromMcpTriage).toEqual(fromCliTriage);

    const fromCoreTriage = await runSetListTriage(projectRoot, intent);
    expect(fromMcpTriage).toEqual(fromCoreTriage);
    expect((fromMcpTriage as { selectedId: string }).selectedId).toBe('papercut');
  });
});

describe('set lists contract helpers', () => {
  it('evaluates triage against default seeded data without runtime id branches', () => {
    const defaults = createDefaultSetListsFile().setLists;
    const result = evaluateSetListTriage({
      userIntent: 'Fix typo in readme label copy',
      eligibleSetLists: defaults,
    });

    expect(result.blocking).toBe(false);
    expect(result.selectedId).toBe('papercut');
  });
});

