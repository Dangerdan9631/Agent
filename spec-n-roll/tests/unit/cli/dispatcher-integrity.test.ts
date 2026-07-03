import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  findLocalCliOrThrow,
  type LocalCliLookupResult,
  parseDispatcherArgs,
  runLocal,
} from '../../../src/dispatcher/index.js';
import {
  LOCAL_INSTALL_LAYOUT_VERSION,
  validateLocalInstall,
} from '../../../src/sdk/install/local-install-integrity.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project root directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created project root.
 */
function createProjectRoot(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-dispatcher-integrity-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a layout v1 local install under the project root with an executable launcher.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param options - Optional overrides for launcher exit code and manifest fields.
 * @returns Absolute path to the local CLI launcher binary.
 */
function writeValidLocalInstall(
  projectRoot: string,
  options?: { exitCode?: number; layoutVersion?: number; legacy?: boolean },
): string {
  const cliRoot = path.join(projectRoot, '.spec-n-roll', 'cli');
  mkdirSync(path.join(cliRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(cliRoot, 'dist', 'cli'), { recursive: true });
  mkdirSync(path.join(cliRoot, 'dist', 'ink'), { recursive: true });
  mkdirSync(path.join(cliRoot, 'dist', 'mcp'), { recursive: true });

  const exitCode = options?.exitCode ?? 42;
  const launcherPath = path.join(cliRoot, 'bin', 'spec-n-roll');
  writeFileSync(launcherPath, `#!/usr/bin/env node\nprocess.exit(${exitCode});\n`, 'utf8');
  writeFileSync(path.join(cliRoot, 'dist', 'cli', 'index.js'), 'export {};\n', 'utf8');
  writeFileSync(path.join(cliRoot, 'dist', 'ink', 'index.js'), 'export {};\n', 'utf8');
  writeFileSync(path.join(cliRoot, 'dist', 'mcp', 'server.js'), 'export {};\n', 'utf8');
  writeFileSync(
    path.join(cliRoot, 'package.json'),
    JSON.stringify({ name: 'spec-n-roll', version: '1.0.0' }),
    'utf8',
  );

  const manifest: Record<string, unknown> = {
    toolkitVersion: '1.0.0',
    layoutVersion: options?.layoutVersion ?? LOCAL_INSTALL_LAYOUT_VERSION,
    installedAt: '2026-06-13T00:00:00.000Z',
  };
  if (options?.legacy) {
    manifest.toolkitPackageRoot = '/global/spec-n-roll';
  }
  writeFileSync(path.join(cliRoot, 'install.json'), JSON.stringify(manifest), 'utf8');

  if (process.platform !== 'win32') {
    chmodSync(launcherPath, 0o755);
  }

  return launcherPath;
}

/**
 * Writes only the local CLI launcher without the bundled layout required by integrity checks.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Absolute path to the launcher binary.
 */
function writeLauncherOnly(projectRoot: string): string {
  const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin');
  mkdirSync(cliDir, { recursive: true });
  const launcherPath = path.join(cliDir, 'spec-n-roll');
  writeFileSync(launcherPath, '#!/usr/bin/env node\nprocess.exit(42);\n', 'utf8');

  if (process.platform !== 'win32') {
    chmodSync(launcherPath, 0o755);
  }

  return launcherPath;
}

/**
 * Reads the local CLI fixture and fails loudly if fixture creation did not produce it.
 *
 * @param projectRoot - Absolute path to the test project root.
 * @returns Discovered local CLI details for the project.
 */
function readRequiredLocalCli(projectRoot: string): LocalCliLookupResult {
  const localCli = findLocalCliOrThrow(projectRoot);
  if (localCli == null) {
    throw new Error(`Expected local CLI fixture under ${projectRoot}.`);
  }
  return localCli;
}

/**
 * Asserts that an operation fails with exit code 1 and a matching console error.
 *
 * @param action - Operation expected to report a local dispatcher error.
 * @param messagePattern - Regular expression expected to match the emitted error.
 */
function expectLocalError(action: () => number, messagePattern: RegExp): void {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(action()).toBe(1);
  expect(error).toHaveBeenCalledWith(expect.stringMatching(messagePattern));
  error.mockRestore();
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

describe('runLocal integrity gating', () => {
  it('delegates when layout v1 install passes integrity validation', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('valid');
    writeValidLocalInstall(projectRoot);

    const cliRoot = path.join(projectRoot, '.spec-n-roll', 'cli');
    expect(validateLocalInstall(cliRoot).status).toBe('valid');

    expect(
      runLocal(readRequiredLocalCli(projectRoot), false, ['version'], { cwd: projectRoot }),
    ).toBe(42);
  });

  it('returns actionable error when bundle files are missing', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('missing-bundle');
    writeLauncherOnly(projectRoot);

    expectLocalError(
      () => runLocal(readRequiredLocalCli(projectRoot), false, ['version'], { cwd: projectRoot }),
      /incomplete.*dist\/cli\/index\.js.*update/i,
    );
  });

  it('returns legacy-layout error without falling back to global', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('legacy');
    writeValidLocalInstall(projectRoot, { legacy: true });

    expectLocalError(
      () => runLocal(readRequiredLocalCli(projectRoot), false, ['version'], { cwd: projectRoot }),
      /deprecated layout.*update/i,
    );
  });

  it('delegates update on legacy layout so migration can run', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('legacy-update');
    writeValidLocalInstall(projectRoot, { legacy: true });

    expect(
      runLocal(readRequiredLocalCli(projectRoot), false, ['update', '--dry-run'], {
        cwd: projectRoot,
      }),
    ).toBe(42);
  });

  it('delegates update when bundle files are missing', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('missing-update');
    writeLauncherOnly(projectRoot);

    const localCli = readRequiredLocalCli(projectRoot);

    expectLocalError(
      () => runLocal(localCli, false, ['version'], { cwd: projectRoot }),
      /incomplete/i,
    );

    const repair = runLocal(localCli, false, ['update'], { cwd: projectRoot });
    expect(repair).toBe(42);
  });

  it('parses --global before local install inspection', () => {
    const projectRoot = createProjectRoot('global-bypass');
    writeLauncherOnly(projectRoot);

    expect(parseDispatcherArgs(['--global', 'version'])).toEqual({
      forceGlobal: true,
      args: ['version'],
    });
  });

  it('rejects unknown layout versions before spawn', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('unknown-layout');
    writeValidLocalInstall(projectRoot, { layoutVersion: 99 });

    expectLocalError(
      () => runLocal(readRequiredLocalCli(projectRoot), false, ['version'], { cwd: projectRoot }),
      /unsupported layout version/i,
    );
  });
});
