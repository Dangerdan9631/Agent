import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteJson } from '../core/atomic-write.js';
import { findBuiltPackageVersion } from './build-version.js';
import { LOCAL_INSTALL_LAYOUT_VERSION } from './local-install-integrity.js';

/**
 * Project-relative path to the CLI install manifest recording pinned toolkit metadata.
 */
export const CLI_INSTALL_MANIFEST_RELATIVE_PATH = '.spec-n-roll/cli/install.json';

/**
 * Project-relative path to the staged local bundle directory inside the toolkit package.
 */
export const STAGED_LOCAL_BUNDLE_RELATIVE_PATH = 'dist/local-bundle';

/**
 * Project-relative path to the self-contained runtime bundle inside a project install.
 */
export const LOCAL_RUNTIME_BUNDLE_RELATIVE_PATH = '.spec-n-roll/cli/dist';

/**
 * Persisted metadata for layout v1 self-contained project-local CLI installs.
 */
export interface CliInstallManifest {
  /**
   * Toolkit semver pinned for this project's bundled runtime.
   */
  toolkitVersion: string;
  /**
   * Local install layout generation. Value `1` denotes the self-contained bundle model.
   */
  layoutVersion: number;
  /**
   * ISO 8601 timestamp of the last successful binary install or refresh.
   */
  installedAt: string;
  /**
   * Optional provenance hint for display; does not affect execution resolution.
   */
  installSource?: 'global' | 'registry' | 'linked-source';
}

/**
 * Minimal npm-style descriptor written beside the project-local bundled runtime.
 */
export interface LocalPackageDescriptor {
  /**
   * Package name; must be `spec-n-roll` for version discovery.
   */
  name: 'spec-n-roll';
  /**
   * Toolkit semver matching `install.json.toolkitVersion`.
   */
  version: string;
  /**
   * Module format for bundled ESM entrypoints under `dist/`.
   */
  type: 'module';
}

/**
 * One toolkit-owned launcher or bundle entry reported by update dry-run planning.
 */
export interface LauncherBinaryUpdate {
  /**
   * Project-relative destination path.
   */
  relativePath: string;
  /**
   * Expected UTF-8 launcher body when the entry is a file update.
   */
  expectedContent: string;
  /**
   * When true, the path denotes the opaque runtime bundle directory replaced by install.
   */
  bundleDirectory?: boolean;
}

/**
 * Builds the project-local full CLI launcher script body.
 *
 * @returns UTF-8 ESM source for the `spec-n-roll` launcher entrypoint.
 */
export function buildCliLauncherSource(): string {
  return `#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const binDir = path.dirname(fileURLToPath(import.meta.url));
const bundleEntry = path.join(binDir, '..', 'dist', 'cli', 'index.js');
if (!existsSync(bundleEntry)) {
  console.error(\`Local Spec-N-Roll CLI bundle is missing at \${bundleEntry}. Run \\\`spec-n-roll update\\\` to repair.\`);
  process.exit(1);
}
const result = spawnSync(process.execPath, [bundleEntry, ...process.argv.slice(2)], {
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
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const binDir = path.dirname(fileURLToPath(import.meta.url));
const bundleEntry = path.join(binDir, '..', 'dist', 'mcp', 'server.js');
if (!existsSync(bundleEntry)) {
  console.error(\`Local Spec-N-Roll MCP bundle is missing at \${bundleEntry}. Run \\\`spec-n-roll update\\\` to repair.\`);
  process.exit(1);
}
const result = spawnSync(process.execPath, [bundleEntry, ...process.argv.slice(2)], {
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
 * Resolves the absolute path to the staged local bundle inside a toolkit package.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root.
 * @returns Absolute path to `dist/local-bundle/` when present.
 */
export function resolveStagedLocalBundlePath(toolkitRoot: string): string {
  return path.join(toolkitRoot, STAGED_LOCAL_BUNDLE_RELATIVE_PATH);
}

/**
 * Reads the version of the staged local bundle that will be copied into projects.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root containing `dist/local-bundle/`.
 * @returns Built bundle semver when recorded, otherwise the toolkit source package semver.
 */
export function readStagedLocalBundleVersion(toolkitRoot: string): string {
  const stagedBundlePath = resolveStagedLocalBundlePath(toolkitRoot);
  return findBuiltPackageVersion(stagedBundlePath) ?? readToolkitVersionFromRoot(toolkitRoot);
}

/**
 * Returns expected launcher file bodies and bundle directory for toolkit-owned binary updates.
 *
 * @returns Relative launcher paths, UTF-8 launcher sources, and the runtime bundle directory.
 */
export function collectLauncherBinaryUpdates(): LauncherBinaryUpdate[] {
  const launcher = buildCliLauncherSource();
  const mcpLauncher = buildMcpLauncherSource();
  const updates: LauncherBinaryUpdate[] = [
    {
      relativePath: path.posix.join('.spec-n-roll', 'cli', 'dist'),
      expectedContent: '',
      bundleDirectory: true,
    },
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
 * Copies the staged local bundle, writes layout v1 manifests, and refreshes launcher scripts.
 *
 * @param projectRoot - Absolute path to the project root receiving `.spec-n-roll/cli/`.
 * @param toolkitRoot - Absolute path to the toolkit package root containing `dist/local-bundle/`.
 * @returns Resolves when the self-contained install is on disk and passes integrity checks.
 */
export async function installProjectBinaries(
  projectRoot: string,
  toolkitRoot: string,
): Promise<void> {
  const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
  const binDir = path.join(cliDir, 'bin');
  const stagedBundlePath = resolveStagedLocalBundlePath(toolkitRoot);
  const cliSource = path.join(stagedBundlePath, 'cli', 'index.js');
  const mcpSource = path.join(stagedBundlePath, 'mcp', 'server.js');

  if (!existsSync(cliSource) || !existsSync(mcpSource)) {
    throw new Error(
      'Toolkit local bundle staging output is missing. Run `npm run build` in the Spec-N-Roll package before init.',
    );
  }

  await fse.ensureDir(binDir);

  const distDir = path.join(cliDir, 'dist');
  if (existsSync(distDir)) {
    await fse.remove(distDir);
  }
  await fse.copy(stagedBundlePath, distDir);

  const toolkitVersion = readStagedLocalBundleVersion(toolkitRoot);
  const installedAt = new Date().toISOString();

  const packageDescriptor: LocalPackageDescriptor = {
    name: 'spec-n-roll',
    version: toolkitVersion,
    type: 'module',
  };
  await atomicWriteJson(path.join(cliDir, 'package.json'), packageDescriptor);

  const manifest: CliInstallManifest = {
    toolkitVersion,
    layoutVersion: LOCAL_INSTALL_LAYOUT_VERSION,
    installedAt,
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
