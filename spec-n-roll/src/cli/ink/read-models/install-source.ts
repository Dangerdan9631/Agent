import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findToolkitPackageRoot } from '../../../core/paths.js';

/**
 * Describes whether the global CLI was installed from npm or a linked source tree.
 */
export type InstallSourceKind = 'remote' | 'local';

/**
 * Resolved install source metadata for global instance home content.
 */
export interface InstallSource {
  /**
   * Whether the running global package is linked to a local source tree or installed remotely.
   */
  kind: InstallSourceKind;
  /**
   * Absolute path to the linked toolkit package root when `kind` is `local`.
   */
  sourcePath?: string;
  /**
   * Absolute path to the build-time marker file checked at runtime.
   */
  markerPath: string;
}

/**
 * Options for resolving install source from the running CLI layout.
 */
export interface ReadInstallSourceOptions {
  /**
   * Directory containing the built CLI entrypoint and marker file. Defaults to the running CLI directory.
   */
  cliDirectory?: string;
}

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
