import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { findToolkitPackageRoot } from '../core/paths.js';

/**
 * File name written beside built artifacts to record the package version used
 * during the build that produced those artifacts.
 */
export const BUILT_PACKAGE_VERSION_FILENAME = '.built-package-version';

/**
 * Reads a non-empty built-version marker from a directory when present.
 *
 * @param directory - Absolute or relative directory path to inspect.
 * @returns Marker semver or null when no readable marker exists.
 */
function readBuiltVersionMarker(directory: string): string | null {
  const markerPath = path.join(directory, BUILT_PACKAGE_VERSION_FILENAME);
  if (!existsSync(markerPath)) {
    return null;
  }

  const version = readFileSync(markerPath, 'utf8').trim();
  return version.length > 0 ? version : null;
}

/**
 * Walks upward from a built artifact directory to find the nearest build-version marker.
 *
 * @param startDir - Directory to begin searching from. Must be at or below the toolkit package root.
 * @returns Built artifact semver or null when no marker is found before the package root.
 */
export function findBuiltPackageVersion(startDir: string): string | null {
  let current = path.resolve(startDir);

  while (true) {
    const version = readBuiltVersionMarker(current);
    if (version != null) {
      return version;
    }

    const packageJsonPath = path.join(current, 'package.json');
    if (existsSync(packageJsonPath)) {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string };
      if (pkg.name === 'spec-n-roll') {
        return null;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * Reads the source package version from a toolkit package root.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root.
 * @returns Semver from the toolkit package descriptor.
 */
export function readSourcePackageVersion(toolkitRoot: string): string {
  const packageJsonPath = path.join(toolkitRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
}

/**
 * Resolves the effective runtime version for built artifacts below a toolkit root.
 *
 * @param startDir - Directory to begin build-marker lookup from.
 * @returns Built marker semver when present, otherwise the enclosing source package version.
 */
export function readRuntimePackageVersion(startDir: string): string {
  const builtVersion = findBuiltPackageVersion(startDir);
  if (builtVersion != null) {
    return builtVersion;
  }

  const packageRoot = findToolkitPackageRoot(startDir);
  return readSourcePackageVersion(packageRoot);
}
