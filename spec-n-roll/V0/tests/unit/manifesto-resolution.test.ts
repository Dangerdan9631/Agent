import os from 'node:os';
import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import type { WorkflowConfig } from '../../src/sdk/config/schema.js';
import { ManifestoResolver } from '../../src/sdk/manifesto/resolver.js';

const tempRoots: string[] = [];

/**
 * Creates a temporary project root for manifesto source fixtures.
 *
 * @returns Absolute temporary project root.
 */
async function createProject(): Promise<string> {
  const projectRoot = path.join(
    os.tmpdir(),
    `spec-n-roll-manifesto-${Date.now()}-${Math.random()}`,
  );
  tempRoots.push(projectRoot);
  await fse.ensureDir(path.join(projectRoot, '.spec-n-roll', 'config', 'manifesto'));
  return projectRoot;
}

/**
 * Builds a workflow configuration with global and plan-specific manifesto references.
 *
 * @returns Valid workflow configuration fixture.
 */
function createConfig(): WorkflowConfig {
  return {
    schemaVersion: '2',
    toolkitVersion: '0.1.2',
    agents: [],
    manifestos: [
      {
        id: 'engineering',
        version: '1.0.0',
        purpose: 'Shared engineering guidance',
        source: '.spec-n-roll/config/manifesto/engineering.md',
        protectedRules: ['preserve-user-artifacts'],
        requirements: { tools: ['read'] },
      },
      {
        id: 'planning',
        version: '2.1.0',
        purpose: 'Planning refinements',
        source: '.spec-n-roll/config/manifesto/planning.md',
      },
    ],
    globalManifestos: [{ id: 'engineering', version: '1.0.0' }],
    steps: [
      {
        id: 'plan',
        kind: 'built-in',
        command: 'spec-n-plan',
        enabled: true,
        manifestos: [{ id: 'planning', version: '2.1.0' }],
      },
    ],
    workflows: [{ id: 'full', name: 'Full', steps: ['plan'] }],
    defaultWorkflowId: 'full',
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fse.remove(root)));
});

describe('ManifestoResolver', () => {
  it('loads global manifestos before ordered step refinements', async () => {
    const projectRoot = await createProject();
    await fse.writeFile(
      path.join(projectRoot, '.spec-n-roll/config/manifesto/engineering.md'),
      'Global guidance',
    );
    await fse.writeFile(
      path.join(projectRoot, '.spec-n-roll/config/manifesto/planning.md'),
      'Planning guidance',
    );
    const config = createConfig();

    const result = await new ManifestoResolver().resolve(projectRoot, config, config.steps[0]!);

    expect(result.blocking).toBe(false);
    expect(result.manifestos.map((entry) => entry.id)).toEqual(['engineering', 'planning']);
    expect(result.provenance.map((entry) => [entry.scope, entry.order, entry.outcome])).toEqual([
      ['global', 0, 'loaded'],
      ['step', 1, 'loaded'],
    ]);
  });

  it('blocks required failures and skips optional failures with provenance', async () => {
    const projectRoot = await createProject();
    const config = createConfig();
    config.globalManifestos = [
      { id: 'missing-required' },
      { id: 'missing-optional', required: false },
    ];

    const result = await new ManifestoResolver().resolve(projectRoot, config, config.steps[0]!);

    expect(result.blocking).toBe(true);
    expect(result.provenance.map((entry) => entry.outcome)).toEqual([
      'blocked',
      'skipped',
      'blocked',
    ]);
    expect(result.diagnostics).toContain('Manifesto "missing-optional" is not declared.');
  });

  it('blocks a step manifesto that attempts to replace a protected global rule', async () => {
    const projectRoot = await createProject();
    await fse.writeFile(
      path.join(projectRoot, '.spec-n-roll/config/manifesto/engineering.md'),
      'Global guidance',
    );
    await fse.writeFile(
      path.join(projectRoot, '.spec-n-roll/config/manifesto/planning.md'),
      'Planning guidance',
    );
    const config = createConfig();
    config.manifestos![1]!.protectedRules = ['preserve-user-artifacts'];

    const result = await new ManifestoResolver().resolve(projectRoot, config, config.steps[0]!);

    expect(result.blocking).toBe(true);
    expect(result.provenance[1]).toMatchObject({ outcome: 'blocked', scope: 'step' });
  });
});
