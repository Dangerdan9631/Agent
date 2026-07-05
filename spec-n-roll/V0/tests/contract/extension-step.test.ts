import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  invokeExtensionHandler,
  loadExtensionRegistry,
  resolveActiveStepHandler,
  runTriageWithExtensions,
} from '../../src/sdk/extensions/hooks.js';
import { assessTriage } from '../../src/sdk/specs/triage.js';
import { createDefaultSetListsFile } from '../../src/sdk/setlists/index.js';
import { createDefaultWorkflowConfig } from '../../src/sdk/init.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../../src/sdk/workflow/artifacts.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory for extension contract tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-ext-step-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes workflow.config.json and a custom triage extension into a temp project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param extensionEnabled - Whether the custom triage extension is enabled.
 */
function writeProjectWithTriageExtension(projectRoot: string, extensionEnabled: boolean): void {
  const extensionDir = path.join(
    projectRoot,
    '.spec-n-roll',
    'config',
    'extensions',
    'custom-triage',
  );
  mkdirSync(extensionDir, { recursive: true });

  const handlerPath = path.join(extensionDir, 'triage-handler.mjs');
  writeFileSync(
    handlerPath,
    `export async function handler(context) {
  return {
    mode: 'heuristic',
    proposedSetListId: 'papercut',
    proposedWorkflowId: 'papercut',
    rationale: 'Custom extension triage selected papercut.',
    eligibleSetLists: context.enabledSetLists ?? [],
    defaultSetListId: 'quick',
    defaultWorkflowId: context.defaultWorkflowId,
    ambiguous: false,
  };
}
`,
    'utf8',
  );

  writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    `${JSON.stringify(
      {
        manifestVersion: '1',
        id: 'custom-triage',
        name: 'Custom Triage',
        targetToolkitVersion: '0.1.0',
        steps: [
          {
            id: 'custom-triage-step',
            stepId: 'triage',
            command: 'spec-n-triage',
            entrypoint: '.spec-n-roll/config/extensions/custom-triage/triage-handler.mjs',
            priority: 10,
            enabledByDefault: true,
          },
        ],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const config = createDefaultWorkflowConfig({
    toolkitVersion: '0.1.0',
    selectedAgentIds: ['cursor'],
  });
  config.extensions = [
    {
      id: 'custom-triage',
      manifestPath: '.spec-n-roll/config/extensions/custom-triage/manifest.json',
      enabled: extensionEnabled,
    },
  ];

  const configPath = path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH);
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const setListsPath = path.join(projectRoot, '.spec-n-roll', 'config', 'set-lists.json');
  writeFileSync(setListsPath, `${JSON.stringify(createDefaultSetListsFile(), null, 2)}\n`, 'utf8');
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

describe('extension step invocation', () => {
  it('invokes an extension handler via import() instead of the built-in triage handler', async () => {
    const projectRoot = createTempDir('enabled');
    writeProjectWithTriageExtension(projectRoot, true);

    const registry = await loadExtensionRegistry(projectRoot);
    const resolved = resolveActiveStepHandler(registry, 'triage');

    expect(resolved.kind).toBe('extension');
    expect(resolved.extensionId).toBe('custom-triage');
    expect(resolved.activeHandlerNotice).toContain('custom-triage');

    const assessment = await runTriageWithExtensions({
      projectRoot,
      description: 'Cross-cutting platform-wide authentication redesign',
      defaultWorkflowId: 'quick',
      availableWorkflowIds: ['papercut', 'quick', 'full'],
    });

    expect(assessment.proposedSetListId).toBe('papercut');
    expect(assessment.rationale).toContain('Custom extension triage');
  });

  it('falls back to the built-in handler when the extension is disabled', async () => {
    const projectRoot = createTempDir('disabled');
    writeProjectWithTriageExtension(projectRoot, false);

    const registry = await loadExtensionRegistry(projectRoot);
    const resolved = resolveActiveStepHandler(registry, 'triage');

    expect(resolved.kind).toBe('built-in');
    expect(resolved.activeHandlerNotice).toContain('built-in');

    const assessment = await runTriageWithExtensions({
      projectRoot,
      description: 'Cross-cutting platform-wide authentication redesign',
      defaultWorkflowId: 'quick',
      availableWorkflowIds: ['papercut', 'quick', 'full'],
    });

    const builtIn = assessTriage({
      description: 'Cross-cutting platform-wide authentication redesign',
      defaultWorkflowId: 'quick',
      availableWorkflowIds: ['papercut', 'quick', 'full'],
      enabledSetLists: createDefaultSetListsFile().setLists,
    });

    expect(assessment).toEqual(builtIn);
  });

  it('fails the step with remediation when an extension handler throws', async () => {
    const projectRoot = createTempDir('handler-error');
    const extensionDir = path.join(projectRoot, '.spec-n-roll', 'config', 'extensions', 'broken');
    mkdirSync(extensionDir, { recursive: true });
    writeFileSync(
      path.join(extensionDir, 'handler.mjs'),
      `export async function handler() {
  throw new Error('boom');
}
`,
      'utf8',
    );

    await expect(
      invokeExtensionHandler(projectRoot, '.spec-n-roll/config/extensions/broken/handler.mjs', {}),
    ).rejects.toThrow(/remediation/i);
  });
});
