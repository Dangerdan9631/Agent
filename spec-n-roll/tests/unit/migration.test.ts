import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { readWorkflowConfigTolerant } from '../../src/config/reader.js';
import {
  applyUserConfigMigrations,
  BreakingMigrationError,
  planUserConfigMigrations,
  WORKFLOW_CONFIG_SCHEMA_VERSION,
} from '../../src/updates/migration.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory for migration unit tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-migration-${prefix}-${Date.now()}`);
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

const minimalAgents = [{ id: 'cursor', enabled: true, commandPrefix: 'spec-n-' as const }];

const minimalSteps = [
  {
    id: 'specify',
    kind: 'built-in' as const,
    command: 'spec-n-specify',
    enabled: true,
  },
];

const minimalWorkflowVariants = [
  {
    id: 'quick',
    name: 'Quick',
    steps: ['specify'],
  },
];

/**
 * Builds a legacy v1 workflow config fixture using pre-v2 field names.
 *
 * @param overrides - Optional fields to merge into the legacy document.
 * @returns Raw workflow config object at schema version 1.
 */
function buildLegacyWorkflowConfigV1(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: '1',
    installedToolkitVersion: '0.1.0',
    agents: minimalAgents,
    steps: minimalSteps,
    workflowVariants: minimalWorkflowVariants,
    defaultWorkflowId: 'quick',
    unknownFutureField: 'ignored',
    ...overrides,
  };
}

describe('readWorkflowConfigTolerant', () => {
  it('parses a v1 config with legacy field names and ignores unknown fields', () => {
    const parsed = readWorkflowConfigTolerant(buildLegacyWorkflowConfigV1());

    expect(parsed.schemaVersion).toBe('1');
    expect(parsed.toolkitVersion).toBe('0.1.0');
    expect(parsed.workflows).toEqual(minimalWorkflowVariants);
    expect(parsed).not.toHaveProperty('unknownFutureField');
    expect(parsed).not.toHaveProperty('workflowVariants');
  });
});

describe('planUserConfigMigrations', () => {
  it('plans a non-breaking migration from workflow config v1 to v2', async () => {
    const projectRoot = createTempDir('plan-non-breaking');
    const configDir = path.join(projectRoot, '.spec-n-roll', 'config');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, 'workflow.config.json'),
      `${JSON.stringify(buildLegacyWorkflowConfigV1(), null, 2)}\n`,
      'utf8',
    );

    const plan = await planUserConfigMigrations(projectRoot, '0.2.0');

    expect(plan.migrations).toHaveLength(1);
    expect(plan.migrations[0]?.relativePath).toBe('.spec-n-roll/config/workflow.config.json');
    expect(plan.migrations[0]?.breaking).toBe(false);
    expect(plan.migrations[0]?.toSchemaVersion).toBe(WORKFLOW_CONFIG_SCHEMA_VERSION);
    expect(plan.breakingCount).toBe(0);
  });

  it('marks legacy tier routing removal as a breaking migration', async () => {
    const projectRoot = createTempDir('plan-breaking');
    const configDir = path.join(projectRoot, '.spec-n-roll', 'config');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, 'workflow.config.json'),
      `${JSON.stringify(
        buildLegacyWorkflowConfigV1({ legacyTierRouting: { enabled: true } }),
        null,
        2,
      )}\n`,
      'utf8',
    );

    const plan = await planUserConfigMigrations(projectRoot, '0.2.0');

    expect(plan.breakingCount).toBe(1);
    expect(plan.migrations[0]?.breaking).toBe(true);
  });
});

describe('applyUserConfigMigrations', () => {
  it('applies non-breaking migrations automatically', async () => {
    const projectRoot = createTempDir('apply-non-breaking');
    const configPath = path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json');
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      `${JSON.stringify(buildLegacyWorkflowConfigV1(), null, 2)}\n`,
      'utf8',
    );

    const plan = await planUserConfigMigrations(projectRoot, '0.2.0');
    const result = await applyUserConfigMigrations(projectRoot, plan, {
      targetToolkitVersion: '0.2.0',
    });

    expect(result.applied).toHaveLength(1);
    const migrated = JSON.parse(readFileSync(configPath, 'utf8')) as {
      schemaVersion: string;
      toolkitVersion: string;
      workflows: unknown[];
    };
    expect(migrated.schemaVersion).toBe(WORKFLOW_CONFIG_SCHEMA_VERSION);
    expect(migrated.toolkitVersion).toBe('0.2.0');
    expect(migrated.workflows).toEqual(minimalWorkflowVariants);
  });

  it('requires confirmation before applying breaking migrations without --force', async () => {
    const projectRoot = createTempDir('apply-breaking-blocked');
    const configPath = path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json');
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      `${JSON.stringify(
        buildLegacyWorkflowConfigV1({ legacyTierRouting: { enabled: true } }),
        null,
        2,
      )}\n`,
      'utf8',
    );

    const plan = await planUserConfigMigrations(projectRoot, '0.2.0');

    await expect(
      applyUserConfigMigrations(projectRoot, plan, {
        targetToolkitVersion: '0.2.0',
        force: false,
      }),
    ).rejects.toThrow(BreakingMigrationError);
  });

  it('applies breaking migrations when explicitly confirmed', async () => {
    const projectRoot = createTempDir('apply-breaking-confirmed');
    const configPath = path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json');
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      `${JSON.stringify(
        buildLegacyWorkflowConfigV1({ legacyTierRouting: { enabled: true } }),
        null,
        2,
      )}\n`,
      'utf8',
    );

    const plan = await planUserConfigMigrations(projectRoot, '0.2.0');
    const result = await applyUserConfigMigrations(projectRoot, plan, {
      targetToolkitVersion: '0.2.0',
      force: true,
    });

    expect(result.applied).toHaveLength(1);
    const migrated = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    expect(migrated.schemaVersion).toBe(WORKFLOW_CONFIG_SCHEMA_VERSION);
    expect(migrated).not.toHaveProperty('legacyTierRouting');
  });
});
