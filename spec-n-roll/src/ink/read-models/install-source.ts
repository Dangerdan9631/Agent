import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveGlobalCliPath } from '../../dispatcher/location.js';
import { findToolkitPackageRoot } from '../../sdk/core/paths.js';
import type { InstallSource, ReadInstallSourceOptions } from '../../sdk/install/install-source.js';
export type {
  InstallSource,
  InstallSourceKind,
  ReadInstallSourceOptions,
} from '../../sdk/install/install-source.js';

/**
 * Relative path to the linked-source marker file from the CLI build directory.
 *
 * @returns Project-relative marker path under `dist/cli/`.
 */
export function installSourceMarkerRelativePath(): string {
  return '.source-package-root';
}

/**
 * Resolves the absolute marker path adjacent to the built CLI entrypoint.
 *
 * @param cliDirectory - Directory containing the built CLI artifacts.
 * @returns Absolute path to the marker file.
 */
export function installSourceMarkerPath(cliDirectory: string): string {
  return path.join(cliDirectory, installSourceMarkerRelativePath());
}

/**
 * Resolves the CLI directory used to locate the install source marker.
 *
 * @param options - Optional CLI directory override for tests.
 * @returns Absolute path to the CLI build directory.
 */
function resolveCliDirectory(options: ReadInstallSourceOptions = {}): string {
  if (options.cliDirectory != null) {
    return path.resolve(options.cliDirectory);
  }

  return path.dirname(fileURLToPath(import.meta.url));
}

/**
 * Reads install source metadata from the build-time marker adjacent to the CLI package.
 *
 * @param options - Optional CLI directory override for tests.
 * @returns Install source kind and optional linked source path.
 */
export function readInstallSource(options: ReadInstallSourceOptions = {}): InstallSource {
  const cliDirectory = resolveCliDirectory(options);
  const markerPath = installSourceMarkerPath(cliDirectory);

  if (!existsSync(markerPath)) {
    return {
      kind: 'remote',
      markerPath,
    };
  }

  const rawSourcePath = readFileSync(markerPath, 'utf8').trim();
  if (rawSourcePath.length === 0) {
    return {
      kind: 'remote',
      markerPath,
    };
  }

  const sourcePath = path.resolve(rawSourcePath);
  const packageJsonPath = path.join(sourcePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return {
      kind: 'remote',
      markerPath,
    };
  }

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string };
    if (pkg.name !== 'spec-n-roll') {
      return {
        kind: 'remote',
        markerPath,
      };
    }
  } catch {
    return {
      kind: 'remote',
      markerPath,
    };
  }

  return {
    kind: 'local',
    sourcePath,
    markerPath,
  };
}

/**
 * Resolves the toolkit package root for the running CLI process.
 *
 * @returns Absolute path to the toolkit package root.
 */
export function resolveRunningToolkitPackageRoot(): string {
  return findToolkitPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
}

/**
 * Reads install source metadata passed from a delegating global dispatcher process.
 *
 * @param env - Environment variables for the current process.
 * @returns Delegated global install source metadata, or null when execution was not delegated.
 */
function readDelegatedGlobalInstallSource(env: NodeJS.ProcessEnv): InstallSource | null {
  if (env.SPEC_N_ROLL_DISPATCHED !== '1') {
    return null;
  }

  const cliDirectory = env.SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY?.trim();
  const markerPath =
    cliDirectory != null && cliDirectory.length > 0
      ? installSourceMarkerPath(cliDirectory)
      : installSourceMarkerPath('[delegated]');

  if (env.SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE === 'local') {
    const sourcePath = env.SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH?.trim();
    return {
      kind: 'local',
      ...(sourcePath != null && sourcePath.length > 0
        ? { sourcePath: path.resolve(sourcePath) }
        : {}),
      markerPath,
    };
  }

  return {
    kind: 'remote',
    markerPath,
  };
}

/**
 * Reads install source metadata from the globally installed dispatcher CLI layout.
 *
 * @param env - Environment variables for the current process. Uses dispatcher metadata when delegated.
 * @returns Install source kind and optional linked source path for the global dispatcher.
 */
export function readGlobalInstallSource(env: NodeJS.ProcessEnv = process.env): InstallSource {
  const delegatedSource = readDelegatedGlobalInstallSource(env);
  if (delegatedSource != null) {
    return delegatedSource;
  }

  const globalCliPath = resolveGlobalCliPath();
  return readInstallSource({ cliDirectory: path.dirname(globalCliPath) });
}
