import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { runUpdate } from '../../src/sdk/update.js';
import { readStagedLocalBundleVersion } from '../../src/sdk/install/local-binaries.js';
import { resolveToolkitRoot } from '../../src/sdk/init.js';
import { checkExtensionCompatibility } from '../../src/sdk/extensions/compatibility.js';
import { extensionManifestSchema } from '../../src/sdk/extensions/manifest.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory for compatibility unit tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-compat-${prefix}-${Date.now()}`);
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

describe('checkExtensionCompatibility', () => {
  it('returns a warning when compatibility.json lists an incompatible combination', async () => {
    const projectRoot = createTempDir('warning');
    const compatibilityPath = path.join(projectRoot, '.spec-n-roll', 'compatibility.json');
    mkdirSync(path.dirname(compatibilityPath), { recursive: true });
    writeFileSync(
      compatibilityPath,
      `${JSON.stringify(
        {
          incompatibleCombinations: [
            {
              extensionId: 'cursor',
              toolkitVersion: '0.2.0',
              reason: 'Cursor MCP merge format changed',
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const manifest = extensionManifestSchema.parse({
      manifestVersion: '1',
      id: 'cursor',
      name: 'Cursor',
      targetToolkitVersion: '0.1.0',
      agentSetup: {
        mcpConfig: {
          serverId: 'spec-n-roll',
          format: 'cursor-mcp-json',
          targets: [{ path: '.cursor/mcp.json' }],
        },
      },
    });

    const warnings = await checkExtensionCompatibility(projectRoot, '0.2.0', [
      { id: 'cursor', manifest },
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('cursor');
    expect(warnings[0]).toContain('0.2.0');
  });

  it('returns no warnings when no incompatible combination matches', async () => {
    const projectRoot = createTempDir('no-warning');
    const compatibilityPath = path.join(projectRoot, '.spec-n-roll', 'compatibility.json');
    mkdirSync(path.dirname(compatibilityPath), { recursive: true });
    writeFileSync(
      compatibilityPath,
      `${JSON.stringify({ incompatibleCombinations: [] }, null, 2)}\n`,
      'utf8',
    );

    const manifest = extensionManifestSchema.parse({
      manifestVersion: '1',
      id: 'cursor',
      name: 'Cursor',
      targetToolkitVersion: '0.1.0',
      agentSetup: {
        mcpConfig: {
          serverId: 'spec-n-roll',
          format: 'cursor-mcp-json',
          targets: [{ path: '.cursor/mcp.json' }],
        },
      },
    });

    const warnings = await checkExtensionCompatibility(projectRoot, '0.2.0', [
      { id: 'cursor', manifest },
    ]);

    expect(warnings).toEqual([]);
  });
});

describe('runUpdate extension compatibility', () => {
  it('reports compatibility warnings without blocking the update', async () => {
    const projectRoot = createTempDir('update-warning');
    const configDir = path.join(projectRoot, '.spec-n-roll', 'config');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, 'workflow.config.json'),
      `${JSON.stringify(
        {
          schemaVersion: '2',
          toolkitVersion: '0.1.0',
          agents: [{ id: 'cursor', enabled: true, commandPrefix: 'spec-n-' }],
          steps: [
            {
              id: 'specify',
              kind: 'built-in',
              command: 'spec-n-specify',
              enabled: true,
            },
          ],
          workflows: [{ id: 'quick', name: 'Quick', steps: ['specify'] }],
          defaultWorkflowId: 'quick',
          extensions: [
            {
              id: 'cursor',
              manifestPath: '.spec-n-roll/bundled-extensions/cursor/manifest.json',
              enabled: true,
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(
      path.join(configDir, 'project-metadata.json'),
      `${JSON.stringify(
        {
          schemaVersion: '2',
          nextTaskSpecId: 1,
          updatedAt: '2026-06-10T12:00:00.000Z',
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const compatibilityPath = path.join(projectRoot, '.spec-n-roll', 'compatibility.json');
    mkdirSync(path.dirname(compatibilityPath), { recursive: true });
    const targetToolkitVersion = readStagedLocalBundleVersion(resolveToolkitRoot());
    writeFileSync(
      compatibilityPath,
      `${JSON.stringify(
        {
          incompatibleCombinations: [
            {
              extensionId: 'cursor',
              toolkitVersion: targetToolkitVersion,
              reason: 'Known bad pairing for test fixture',
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const manifestDir = path.join(projectRoot, '.spec-n-roll', 'bundled-extensions', 'cursor');
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(
      path.join(manifestDir, 'manifest.json'),
      `${JSON.stringify(
        {
          manifestVersion: '1',
          id: 'cursor',
          name: 'Cursor',
          targetToolkitVersion: '0.1.0',
          agentSetup: {
            mcpConfig: {
              serverId: 'spec-n-roll',
              format: 'cursor-mcp-json',
              targets: [{ path: '.cursor/mcp.json' }],
            },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const result = await runUpdate({
      projectRoot,
    });

    expect(result.extensionWarnings.length).toBeGreaterThanOrEqual(1);
    expect(result.overwrittenFiles.length).toBeGreaterThan(0);
  });
});
