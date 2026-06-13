import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDefaultWorkflowConfig } from '../../src/cli/commands/init.js';
import { loadExtensionRegistry } from '../../src/extensions/hooks.js';
import { loadWorkflowDefinition } from '../../src/workflow/engine.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../../src/workflow/artifacts.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory for workflow variant unit tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-variants-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a default workflow.config.json into a temp project root.
 *
 * @param projectRoot - Absolute path to the project root.
 */
function writeDefaultWorkflowConfig(projectRoot: string): void {
  const config = createDefaultWorkflowConfig({
    toolkitVersion: '0.1.0',
    selectedAgentIds: ['cursor'],
  });
  config.extensions = [];
  const configPath = path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH);
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
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

describe('workflow variant loading', () => {
  it('loads papercut, quick, and full variants from workflow.config.json', async () => {
    const projectRoot = createTempDir('default-variants');
    writeDefaultWorkflowConfig(projectRoot);

    const definition = await loadWorkflowDefinition(projectRoot);

    expect(definition.variants.map((variant) => variant.id).sort()).toEqual([
      'full',
      'papercut',
      'quick',
    ]);
    expect(definition.variants.find((variant) => variant.id === 'papercut')?.steps).toEqual([
      'specify',
      'implement',
    ]);
    expect(definition.variants.find((variant) => variant.id === 'quick')?.steps).toEqual([
      'specify',
      'tasks',
      'implement',
    ]);
    expect(definition.variants.find((variant) => variant.id === 'full')?.steps).toEqual([
      'specify',
      'plan',
      'tasks',
      'implement',
    ]);
  });

  it('keeps shared step definitions by reference instead of duplicating step entries', async () => {
    const projectRoot = createTempDir('shared-steps');
    writeDefaultWorkflowConfig(projectRoot);

    const definition = await loadWorkflowDefinition(projectRoot);
    const stepIds = [...definition.stepById.keys()].sort();

    expect(stepIds).toEqual(['implement', 'plan', 'specify', 'tasks']);
    expect(definition.variants.every((variant) => variant.steps[0] === 'specify')).toBe(true);

    const tasksReferences = definition.variants
      .filter((variant) => variant.steps.includes('tasks'))
      .map(() => definition.stepById.get('tasks'));

    expect(tasksReferences).toHaveLength(2);
    expect(new Set(tasksReferences).size).toBe(1);
  });

  it('warns and skips hooks targeting unknown step ids at manifest load', async () => {
    const projectRoot = createTempDir('unknown-hook');
    writeDefaultWorkflowConfig(projectRoot);

    const extensionDir = path.join(projectRoot, '.spec-n-roll', 'config', 'extensions', 'hooky');
    mkdirSync(extensionDir, { recursive: true });
    writeFileSync(
      path.join(extensionDir, 'manifest.json'),
      `${JSON.stringify(
        {
          manifestVersion: '1',
          id: 'hooky',
          name: 'Hooky',
          targetToolkitVersion: '0.1.0',
          hooks: [
            {
              id: 'before-typo',
              event: 'before_typo-step',
              entrypoint: '.spec-n-roll/config/extensions/hooky/hook.mjs',
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(path.join(extensionDir, 'hook.mjs'), 'export async function handler() {}\n', 'utf8');

    const configPath = path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH);
    const rawConfig = JSON.parse(readFileSync(configPath, 'utf8')) as ReturnType<
      typeof createDefaultWorkflowConfig
    >;
    rawConfig.extensions = [
      ...(rawConfig.extensions ?? []),
      {
        id: 'hooky',
        manifestPath: '.spec-n-roll/config/extensions/hooky/manifest.json',
        enabled: true,
      },
    ];
    writeFileSync(configPath, `${JSON.stringify(rawConfig, null, 2)}\n`, 'utf8');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const registry = await loadExtensionRegistry(projectRoot);

    expect(registry.hookWarnings.some((warning) => warning.includes('typo-step'))).toBe(true);
    expect(registry.skippedHooks).toContain('before_typo-step');

    warnSpy.mockRestore();
  });
});
