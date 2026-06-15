import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { STUB_MARKER, defaultStubFileName } from '../../src/sdk/living-specs/step-stubs.js';
import { runImplement } from '../../src/sdk/specs/implement.js';
import { writeWorkflowState } from '../../src/sdk/core/workflow-state.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project root tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created project root.
 */
function createProjectRoot(suffix: string): string {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-tdd-${suffix}-${Date.now()}`);
  tempDirs.push(projectRoot);
  return projectRoot;
}

/**
 * Seeds a minimal task spec directory with workflow state for implement entry.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 */
async function seedTaskSpecForImplement(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<void> {
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(path.join(projectRoot, 'living-specs'), { recursive: true });
  const specDir = path.join(projectRoot, 'specs', `${taskSpecId}-${slug}`);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, 'spec.md'), `---\nstatus: Active\n---\n\n# ${slug}\n`, 'utf8');
  await writeWorkflowState(projectRoot, {
    taskSpecId,
    slug,
    workflowVariantId: 'quick',
    lastCompletedStepId: 'tasks',
    currentStepId: 'implement',
    status: 'active',
  });
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

describe('TDD cycle entry', () => {
  it('runs Cucumber against living specs, generates stub step defs, and fails before code', async () => {
    const projectRoot = createProjectRoot('red');
    await seedTaskSpecForImplement(projectRoot, '001', 'greeting-api');

    const result = await runImplement({
      projectRoot,
      taskSpecId: '001',
      slug: 'greeting-api',
      featureDescription: 'Add greeting API for user authentication',
      scenariosToAdd: [
        {
          name: 'Greeting returns hello',
          steps: [
            'Given the greeting service is available',
            'When a client requests a greeting',
            'Then the response contains hello',
          ],
        },
      ],
    });

    expect(result.livingSpecUpdated).toBe(true);
    expect(result.tddPhase).toBe('red');
    expect(result.stubsGenerated).toBeGreaterThan(0);

    const stubPath = path.join(projectRoot, 'tests', 'step-definitions', defaultStubFileName());
    expect(existsSync(stubPath)).toBe(true);

    const stubContent = readFileSync(stubPath, 'utf8');
    expect(stubContent).toContain(STUB_MARKER);
    expect(stubContent).toContain('the greeting service is available');

    expect(result.testRun.success).toBe(false);
    expect(result.testRun.failedCount).toBeGreaterThan(0);
    expect(result.testRun.scenarios.some((scenario) => scenario.status === 'failed')).toBe(true);
    expect(result.testRun.progressMessage).toMatch(/red/i);
  });

  it('rejects entry when all scenarios pass before production code', async () => {
    const projectRoot = createProjectRoot('red-gate');
    await seedTaskSpecForImplement(projectRoot, '002', 'always-green');

    const featurePath = path.join(projectRoot, 'living-specs', 'user-authentication.feature');
    writeFileSync(
      featurePath,
      `Feature: User authentication

  @spec-n-roll-002
  Scenario: Trivial pass
    Given a passing step
`,
      'utf8',
    );

    const stepDir = path.join(projectRoot, 'tests', 'step-definitions');
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(
      path.join(stepDir, 'passing.mjs'),
      `import { Given } from '@cucumber/cucumber';
Given('a passing step', function () {});
`,
      'utf8',
    );

    await expect(
      runImplement({
        projectRoot,
        taskSpecId: '002',
        slug: 'always-green',
        featureDescription: 'Add OAuth login for user authentication',
        productionCodeWritten: false,
      }),
    ).rejects.toThrow(/red gate/i);
  });
});
