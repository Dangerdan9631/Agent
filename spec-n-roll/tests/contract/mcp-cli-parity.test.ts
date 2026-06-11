import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import { instantiateStepOutput } from '../../src/core/templates.js';
import { readWorkflowState } from '../../src/core/workflow-state.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for parity tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-parity-${prefix}-${Date.now()}`);
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

describe('MCP/CLI parity', () => {
  it('workflow_state_write produces identical file outcome via CLI and core read', async () => {
    const projectRoot = createTempProject('workflow-write');
    mkdirSync(path.join(projectRoot, 'specs', '001-sample-feature'), { recursive: true });

    const cliPath = path.resolve('dist/cli/index.js');
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        'workflow',
        'state',
        'write',
        '--task-spec-id',
        '001',
        '--slug',
        'sample-feature',
        '--workflow-variant-id',
        'quick',
        '--status',
        'active',
      ],
      { cwd: projectRoot, encoding: 'utf8' },
    );

    expect(result.status).toBe(0);

    const statePath = path.join(projectRoot, 'specs', '001-sample-feature', 'workflow-state.json');
    const fromDisk = JSON.parse(readFileSync(statePath, 'utf8')) as {
      taskSpecId: string;
      slug: string;
      workflowVariantId: string;
      status: string;
    };

    expect(fromDisk.taskSpecId).toBe('001');
    expect(fromDisk.slug).toBe('sample-feature');
    expect(fromDisk.workflowVariantId).toBe('quick');
    expect(fromDisk.status).toBe('active');

    const fromCore = await readWorkflowState(projectRoot, '001', 'sample-feature');
    expect(fromCore).toEqual(fromDisk);
  });

  it('step_output_instantiate via core (MCP path) matches CLI file outcome for spec.md', async () => {
    const projectRoot = createTempProject('instantiate');
    mkdirSync(path.join(projectRoot, 'specs', '002-cli-parity'), { recursive: true });

    await instantiateStepOutput(projectRoot, '002', 'cli-parity', 'specify', {
      frontmatter: { status: 'Active', title: 'Parity Feature' },
    });

    const specPath = path.join(projectRoot, 'specs', '002-cli-parity', 'spec.md');
    const coreContent = readFileSync(specPath, 'utf8');
    expect(coreContent).toContain('status: Active');
    expect(coreContent).toContain('title: Parity Feature');

    rmSync(specPath);

    const cliPath = path.resolve('dist/cli/index.js');
    const cliResult = spawnSync(
      process.execPath,
      [
        cliPath,
        'step',
        'instantiate',
        '--task-spec-id',
        '002',
        '--slug',
        'cli-parity',
        '--step-id',
        'specify',
        '--frontmatter',
        'status=Active',
        '--frontmatter',
        'title=Parity Feature',
      ],
      { cwd: projectRoot, encoding: 'utf8' },
    );

    expect(cliResult.status).toBe(0);
    const cliContent = readFileSync(specPath, 'utf8');
    expect(cliContent).toContain('status: Active');
    expect(cliContent).toContain('title: Parity Feature');
  });
});
