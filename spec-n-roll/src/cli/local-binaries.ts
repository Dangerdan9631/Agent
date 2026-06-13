import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteJson } from '../core/atomic-write.js';

/**
 * Project-relative path to the CLI install manifest recording the toolkit package root.
 */
export const CLI_INSTALL_MANIFEST_RELATIVE_PATH = '.spec-n-roll/cli/install.json';

/**
 * Persisted metadata used by project-local CLI and MCP launcher scripts.
 */
export interface CliInstallManifest {
  /**
   * Absolute path to the toolkit package providing `dist/` build outputs.
   */
  toolkitPackageRoot: string;
  /**
   * Toolkit semver installed into the project.
   */
  toolkitVersion: string;
}

/**
 * Builds the project-local full CLI launcher script body.
 *
 * @returns UTF-8 ESM source for the `spec-n-roll` launcher entrypoint.
 */
export function buildCliLauncherSource(): string {
  return `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const binDir = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(binDir, '..', 'install.json'), 'utf8'));
const entry = path.join(manifest.toolkitPackageRoot, 'dist', 'cli', 'index.js');
const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    SPEC_N_ROLL_LOCAL_PIN: '1',
  },
});
process.exit(result.status ?? 1);
`;
}

/**
 * Builds the project-local MCP server launcher script body.
 *
 * @returns UTF-8 ESM source for the `spec-n-roll-mcp` launcher entrypoint.
 */
export function buildMcpLauncherSource(): string {
  return `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const binDir = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(binDir, '..', 'install.json'), 'utf8'));
const entry = path.join(manifest.toolkitPackageRoot, 'dist', 'mcp', 'server.js');
const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
`;
}

/**
 * Reads the toolkit version from package.json at the toolkit root.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root.
 * @returns Semver string for the toolkit package.
 */
export function readToolkitVersionFromRoot(toolkitRoot: string): string {
  const packageJsonPath = path.join(toolkitRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
}

/**
 * Returns expected launcher file bodies for toolkit-owned binary updates.
 *
 * @returns Relative launcher paths and UTF-8 launcher sources.
 */
export function collectLauncherBinaryUpdates(): Array<{ relativePath: string; expectedContent: string }> {
  const launcher = buildCliLauncherSource();
  const mcpLauncher = buildMcpLauncherSource();
  const updates = [
    {
      relativePath: path.posix.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll'),
      expectedContent: launcher,
    },
    {
      relativePath: path.posix.join('.spec-n-roll', 'cli', 'bin', 'snr'),
      expectedContent: launcher,
    },
    {
      relativePath: path.posix.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll-mcp'),
      expectedContent: mcpLauncher,
    },
  ];

  if (process.platform === 'win32') {
    const cliCmdShim =
      '@ECHO off\r\nSETLOCAL ENABLEEXTENSIONS\r\nSET DP0=%~dp0\r\nnode "%DP0%spec-n-roll" %*\r\n';
    updates.push(
      {
        relativePath: path.posix.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll.cmd'),
        expectedContent: cliCmdShim,
      },
      {
        relativePath: path.posix.join('.spec-n-roll', 'cli', 'bin', 'snr.cmd'),
        expectedContent: cliCmdShim,
      },
      {
        relativePath: path.posix.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll-mcp.cmd'),
        expectedContent:
          '@ECHO off\r\nSETLOCAL ENABLEEXTENSIONS\r\nSET DP0=%~dp0\r\nnode "%DP0%spec-n-roll-mcp" %*\r\n',
      },
    );
  }

  return updates;
}

/**
 * Installs version-matched full CLI and MCP launchers into the project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param toolkitRoot - Absolute path to the toolkit package root containing `dist/`.
 */
export async function installProjectBinaries(
  projectRoot: string,
  toolkitRoot: string,
): Promise<void> {
  const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
  const binDir = path.join(cliDir, 'bin');
  await fse.ensureDir(binDir);

  const cliSource = path.join(toolkitRoot, 'dist', 'cli', 'index.js');
  const mcpSource = path.join(toolkitRoot, 'dist', 'mcp', 'server.js');

  if (!existsSync(cliSource) || !existsSync(mcpSource)) {
    throw new Error(
      'Toolkit build outputs are missing. Run `npm run build` in the Spec-N-Roll package before init.',
    );
  }

  const manifest: CliInstallManifest = {
    toolkitPackageRoot: path.resolve(toolkitRoot),
    toolkitVersion: readToolkitVersionFromRoot(toolkitRoot),
  };
  await atomicWriteJson(path.join(cliDir, 'install.json'), manifest);

  const cliTarget = path.join(binDir, 'spec-n-roll');
  const snrTarget = path.join(binDir, 'snr');
  const mcpTarget = path.join(binDir, 'spec-n-roll-mcp');
  const launcher = buildCliLauncherSource();
  writeFileSync(cliTarget, launcher, 'utf8');
  writeFileSync(snrTarget, launcher, 'utf8');
  writeFileSync(mcpTarget, buildMcpLauncherSource(), 'utf8');

  if (process.platform !== 'win32') {
    chmodSync(cliTarget, 0o755);
    chmodSync(snrTarget, 0o755);
    chmodSync(mcpTarget, 0o755);
  }

  if (process.platform === 'win32') {
    const cliCmdShim =
      '@ECHO off\r\nSETLOCAL ENABLEEXTENSIONS\r\nSET DP0=%~dp0\r\nnode "%DP0%spec-n-roll" %*\r\n';
    writeFileSync(path.join(binDir, 'spec-n-roll.cmd'), cliCmdShim, 'utf8');
    writeFileSync(path.join(binDir, 'snr.cmd'), cliCmdShim, 'utf8');
    writeFileSync(
      path.join(binDir, 'spec-n-roll-mcp.cmd'),
      `@ECHO off\r\nSETLOCAL ENABLEEXTENSIONS\r\nSET DP0=%~dp0\r\nnode "%DP0%spec-n-roll-mcp" %*\r\n`,
      'utf8',
    );
  }
}
