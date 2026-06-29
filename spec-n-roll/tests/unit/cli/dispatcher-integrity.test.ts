import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveDelegation } from '../../../src/dispatcher/index.js';
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

describe('resolveDelegation integrity gating', () => {
  it('delegates when layout v1 install passes integrity validation', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('valid');
    writeValidLocalInstall(projectRoot);

    const cliRoot = path.join(projectRoot, '.spec-n-roll', 'cli');
    expect(validateLocalInstall(cliRoot).status).toBe('valid');

    const result = resolveDelegation(['version'], { cwd: projectRoot });
    expect(result).toEqual({ action: 'delegated', exitCode: 42 });
  });

  it('returns actionable error when bundle files are missing', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('missing-bundle');
    writeLauncherOnly(projectRoot);

    const result = resolveDelegation(['version'], { cwd: projectRoot });
    expect(result.action).toBe('error');
    if (result.action === 'error') {
      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/incomplete/i);
      expect(result.message).toMatch(/dist\/cli\/index\.js/);
      expect(result.message).toMatch(/update/i);
    }
  });

  it('returns legacy-layout error without falling back to global', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('legacy');
    writeValidLocalInstall(projectRoot, { legacy: true });

    const result = resolveDelegation(['version'], { cwd: projectRoot });
    expect(result.action).toBe('error');
    if (result.action === 'error') {
      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/deprecated layout/i);
      expect(result.message).toMatch(/update/i);
    }
  });

  it('delegates update on legacy layout so migration can run', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('legacy-update');
    writeValidLocalInstall(projectRoot, { legacy: true });

    const result = resolveDelegation(['update', '--dry-run'], { cwd: projectRoot });
    expect(result).toEqual({ action: 'delegated', exitCode: 42 });
  });

  it('delegates update when bundle files are missing', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('missing-update');
    writeLauncherOnly(projectRoot);

    const blocked = resolveDelegation(['version'], { cwd: projectRoot });
    expect(blocked.action).toBe('error');

    const repair = resolveDelegation(['update'], { cwd: projectRoot });
    expect(repair).toEqual({ action: 'delegated', exitCode: 42 });
  });

  it('continues for --global even when local install is corrupt', () => {
    const projectRoot = createProjectRoot('global-bypass');
    writeLauncherOnly(projectRoot);

    const result = resolveDelegation(['--global', 'version'], { cwd: projectRoot });
    expect(result).toEqual({ action: 'continue' });
  });

  it('rejects unknown layout versions before spawn', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = createProjectRoot('unknown-layout');
    writeValidLocalInstall(projectRoot, { layoutVersion: 99 });

    const result = resolveDelegation(['version'], { cwd: projectRoot });
    expect(result.action).toBe('error');
    if (result.action === 'error') {
      expect(result.message).toMatch(/unsupported layout version/i);
    }
  });
});
