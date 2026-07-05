import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildCliLauncherSource,
  buildMcpLauncherSource,
  collectLauncherBinaryUpdates,
  installProjectBinaries,
  LOCAL_RUNTIME_BUNDLE_RELATIVE_PATH,
  STAGED_LOCAL_BUNDLE_RELATIVE_PATH,
} from '../../../src/sdk/install/local-binaries.js';
import { LOCAL_INSTALL_LAYOUT_VERSION } from '../../../src/sdk/install/local-install-integrity.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-local-binaries-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a minimal staged local bundle tree for install tests.
 *
 * @param toolkitRoot - Absolute path acting as the toolkit package root.
 * @param version - Semver written to toolkit package.json.
 */
function writeStagedLocalBundle(toolkitRoot: string, version = '1.2.3'): void {
  writeFileSync(
    path.join(toolkitRoot, 'package.json'),
    JSON.stringify({ name: 'spec-n-roll', version }, null, 2),
    'utf8',
  );

  const bundleRoot = path.join(toolkitRoot, STAGED_LOCAL_BUNDLE_RELATIVE_PATH);
  mkdirSync(path.join(bundleRoot, 'cli'), { recursive: true });
  mkdirSync(path.join(bundleRoot, 'ink'), { recursive: true });
  mkdirSync(path.join(bundleRoot, 'mcp'), { recursive: true });
  mkdirSync(path.join(bundleRoot, 'templates'), { recursive: true });
  mkdirSync(path.join(bundleRoot, 'scripts'), { recursive: true });

  writeFileSync(path.join(bundleRoot, 'cli', 'index.js'), 'export {};\n', 'utf8');
  writeFileSync(path.join(bundleRoot, 'ink', 'index.js'), 'export {};\n', 'utf8');
  writeFileSync(path.join(bundleRoot, 'mcp', 'server.js'), 'export {};\n', 'utf8');
  writeFileSync(path.join(bundleRoot, 'templates', 'sample.md'), '# sample\n', 'utf8');
  writeFileSync(path.join(bundleRoot, 'scripts', 'sample.sh'), '#!/bin/sh\n', 'utf8');
  writeFileSync(path.join(bundleRoot, '.built-package-version'), `${version}\n`, 'utf8');
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

describe('buildCliLauncherSource', () => {
  it('spawns the in-tree bundled CLI entry without reading install.json', () => {
    const source = buildCliLauncherSource();

    expect(source).toContain(
      "const runtimeMode = process.argv.slice(2).length === 0 ? 'ink' : 'cli'",
    );
    expect(source).toContain("'..', 'dist', runtimeMode, 'index.js'");
    expect(source).toContain('SPEC_N_ROLL_LOCAL_PIN');
    expect(source).not.toContain('toolkitPackageRoot');
    expect(source).not.toContain('install.json');
  });
});

describe('buildMcpLauncherSource', () => {
  it('spawns the in-tree bundled MCP entry without reading install.json', () => {
    const source = buildMcpLauncherSource();

    expect(source).toContain("'..', 'dist', 'mcp', 'server.js'");
    expect(source).toContain('bundleEntry');
    expect(source).toContain('existsSync(bundleEntry)');
    expect(source).toContain('spawnSync(process.execPath, [bundleEntry');
    expect(source).toContain('Local Spec-N-Roll MCP bundle is missing');
    expect(source).not.toContain('toolkitPackageRoot');
    expect(source).not.toContain('install.json');
    expect(source).not.toContain('SPEC_N_ROLL_LOCAL_PIN');
  });
});

describe('collectLauncherBinaryUpdates', () => {
  it('lists the runtime bundle directory and layout v1 launchers', () => {
    const updates = collectLauncherBinaryUpdates();
    const relativePaths = updates.map((update) => update.relativePath);

    expect(relativePaths).toContain(LOCAL_RUNTIME_BUNDLE_RELATIVE_PATH);
    expect(relativePaths).toContain('.spec-n-roll/cli/bin/spec-n-roll');
    expect(relativePaths).toContain('.spec-n-roll/cli/bin/spec-n-roll-mcp');

    const bundleUpdate = updates.find((update) => update.bundleDirectory === true);
    expect(bundleUpdate).toBeDefined();

    for (const launcherPath of [
      '.spec-n-roll/cli/bin/spec-n-roll',
      '.spec-n-roll/cli/bin/snr',
      '.spec-n-roll/cli/bin/spec-n-roll-mcp',
    ]) {
      const update = updates.find((entry) => entry.relativePath === launcherPath);
      expect(update?.expectedContent).not.toContain('toolkitPackageRoot');
    }
  });
});

describe('installProjectBinaries', () => {
  it('copies the staged bundle and writes layout v1 manifest and package.json', async () => {
    const toolkitRoot = createTempDir('toolkit');
    const projectRoot = createTempDir('project');
    writeStagedLocalBundle(toolkitRoot, '2.0.0');

    await installProjectBinaries(projectRoot, toolkitRoot);

    const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
    expect(existsSync(path.join(cliDir, 'dist', 'cli', 'index.js'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'ink', 'index.js'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'mcp', 'server.js'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'templates', 'sample.md'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'scripts', 'sample.sh'))).toBe(true);

    const installManifest = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
      layoutVersion: number;
      installedAt: string;
      toolkitPackageRoot?: string;
    };
    expect(installManifest.toolkitVersion).toBe('2.0.0');
    expect(installManifest.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);
    expect(installManifest.installedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(installManifest.toolkitPackageRoot).toBeUndefined();

    const packageJson = JSON.parse(readFileSync(path.join(cliDir, 'package.json'), 'utf8')) as {
      name: string;
      version: string;
      type: string;
    };
    expect(packageJson).toEqual({ name: 'spec-n-roll', version: '2.0.0', type: 'module' });

    const launcher = readFileSync(path.join(cliDir, 'bin', 'spec-n-roll'), 'utf8');
    expect(launcher).toContain("'..', 'dist', runtimeMode, 'index.js'");
    expect(launcher).not.toContain('toolkitPackageRoot');

    const mcpLauncherPath = path.join(cliDir, 'bin', 'spec-n-roll-mcp');
    expect(existsSync(mcpLauncherPath)).toBe(true);
    const mcpLauncher = readFileSync(mcpLauncherPath, 'utf8');
    expect(mcpLauncher).toContain("'..', 'dist', 'mcp', 'server.js'");
    expect(mcpLauncher).toContain('spawnSync(process.execPath, [bundleEntry');
    expect(mcpLauncher).not.toContain('toolkitPackageRoot');

    if (process.platform !== 'win32') {
      const mode = readFileSync(path.join(cliDir, 'bin', 'spec-n-roll')).toString();
      expect(mode.length).toBeGreaterThan(0);
      chmodSync(path.join(cliDir, 'bin', 'spec-n-roll'), 0o755);
    }
  });

  it('throws when the staged local bundle is missing', async () => {
    const toolkitRoot = createTempDir('toolkit-missing');
    const projectRoot = createTempDir('project-missing');
    writeFileSync(
      path.join(toolkitRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '1.0.0' }),
      'utf8',
    );

    await expect(installProjectBinaries(projectRoot, toolkitRoot)).rejects.toThrow(
      /local bundle staging output is missing/i,
    );
  });

  it('uses the staged bundle marker instead of a newer source package version', async () => {
    const toolkitRoot = createTempDir('toolkit-stale-source');
    const projectRoot = createTempDir('project-stale-source');
    writeStagedLocalBundle(toolkitRoot, '2.0.0-built');
    writeFileSync(
      path.join(toolkitRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '2.1.0-source' }, null, 2),
      'utf8',
    );

    await installProjectBinaries(projectRoot, toolkitRoot);

    const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
    const installManifest = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
    };
    const packageJson = JSON.parse(readFileSync(path.join(cliDir, 'package.json'), 'utf8')) as {
      version: string;
    };

    expect(installManifest.toolkitVersion).toBe('2.0.0-built');
    expect(packageJson.version).toBe('2.0.0-built');
  });
});
