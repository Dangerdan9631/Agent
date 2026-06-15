import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runUpdate } from '../../src/sdk/update.js';
import {
  LOCAL_INSTALL_LAYOUT_VERSION,
  validateLocalInstall,
} from '../../src/sdk/install/local-install-integrity.js';

const tempDirs: string[] = [];
const repoRoot = path.resolve('.');
const dispatcherPath = path.join(repoRoot, 'dist/cli/dispatcher.js');
const legacyFixtureRoot = path.join(repoRoot, 'tests/fixtures/legacy-wrapper-install');
const targetToolkitRoot = path.join(repoRoot, 'tests/fixtures/local-bundle-version-b');

/**
 * Creates a temporary project directory tracked for cleanup.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-legacy-migration-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Copies the legacy wrapper fixture into a temporary project root.
 *
 * @param projectRoot - Absolute path to the destination project root.
 */
function seedLegacyProject(projectRoot: string): void {
  cpSync(legacyFixtureRoot, projectRoot, { recursive: true });
}

/**
 * Runs the global dispatcher with arguments from a project root.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the dispatcher script path.
 * @returns Spawn result with stdout and stderr captured.
 */
function runDispatcher(
  projectRoot: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [dispatcherPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
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

beforeAll(() => {
  if (!existsSync(dispatcherPath)) {
    throw new Error('Build output missing. Run `npm run build` before integration tests.');
  }
  if (!existsSync(path.join(legacyFixtureRoot, '.spec-n-roll/cli/install.json'))) {
    throw new Error('Legacy wrapper fixture missing.');
  }
  if (!existsSync(path.join(targetToolkitRoot, 'dist/local-bundle/cli/index.js'))) {
    throw new Error('Target toolkit fixture bundle missing.');
  }
});

describe('legacy install migration (quickstart scenario 5)', () => {
  it('rejects legacy layout before update and migrates to self-contained bundle on update', async () => {
    const projectRoot = createTempProject('migrate');
    seedLegacyProject(projectRoot);

    const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
    const legacyManifest = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      toolkitPackageRoot?: string;
    };
    expect(legacyManifest.toolkitPackageRoot).toBeTruthy();
    expect(existsSync(path.join(cliDir, 'dist', 'cli', 'index.js'))).toBe(false);

    const beforeValidation = validateLocalInstall(cliDir);
    expect(beforeValidation.status).toBe('invalid');
    expect(beforeValidation.reason).toBe('legacy-layout');

    const blocked = runDispatcher(projectRoot, ['version']);
    expect(blocked.status).not.toBe(0);
    expect(blocked.stderr).toContain('deprecated layout');
    expect(blocked.stderr).toContain('update');

    const legacyManifestPath = path.join(cliDir, 'install.json');
    const legacyManifestForPatch = JSON.parse(readFileSync(legacyManifestPath, 'utf8')) as Record<
      string,
      unknown
    >;
    writeFileSync(
      legacyManifestPath,
      JSON.stringify({
        ...legacyManifestForPatch,
        toolkitPackageRoot: targetToolkitRoot,
      }),
      'utf8',
    );

    const delegatedUpdate =
      process.platform === 'win32'
        ? (() => {
            const result = spawnSync(
              process.execPath,
              [path.join(repoRoot, 'dist', 'cli', 'index.js'), 'update', '--dry-run'],
              {
                cwd: projectRoot,
                encoding: 'utf8',
                env: { ...process.env, SPEC_N_ROLL_LOCAL_PIN: '1' },
              },
            );
            return {
              status: result.status,
              stdout: result.stdout,
              stderr: result.stderr,
            };
          })()
        : runDispatcher(projectRoot, ['update', '--dry-run']);
    expect(delegatedUpdate.status).toBe(0);
    expect(delegatedUpdate.stdout).toMatch(/dry run|would overwrite/i);

    const dryRun = await runUpdate({
      projectRoot,
      toolkitRoot: targetToolkitRoot,
      dryRun: true,
    });
    expect(dryRun.overwrittenFiles).toContain('.spec-n-roll/cli/dist');

    await runUpdate({
      projectRoot,
      toolkitRoot: targetToolkitRoot,
    });

    const installManifest = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
      layoutVersion: number;
      toolkitPackageRoot?: string;
    };
    expect(installManifest.toolkitVersion).toBe('0.9.0-b');
    expect(installManifest.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);
    expect(installManifest.toolkitPackageRoot).toBeUndefined();
    expect(existsSync(path.join(cliDir, 'dist', 'cli', 'index.js'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'mcp', 'server.js'))).toBe(true);

    const launcher = readFileSync(path.join(cliDir, 'bin', 'spec-n-roll'), 'utf8');
    expect(launcher).not.toContain('toolkitPackageRoot');
    expect(launcher).toContain("'..', 'dist', 'cli', 'index.js'");

    const afterValidation = validateLocalInstall(cliDir);
    expect(afterValidation.status).toBe('valid');

    const versionResult = runDispatcher(projectRoot, ['version']);
    expect(versionResult.status).toBe(0);
    expect(versionResult.stdout).toContain('toolkit version: 0.9.0-b');
    expect(versionResult.stdout).toContain('invocation: local');
  }, 30_000);
});
