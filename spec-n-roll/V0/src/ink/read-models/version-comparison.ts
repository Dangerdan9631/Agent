import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { resolveGlobalCliPath } from '../../dispatcher/location.js';
import { readToolkitVersionFromRoot } from '../../sdk/install/local-binaries.js';
import { readRuntimePackageVersion } from '../../sdk/install/build-version.js';

/**
 * Identifies which latest-version source applies to a version comparison.
 */
export type VersionComparisonTarget = 'npm-registry' | 'linked-source' | 'global-install';

/**
 * Result of comparing the running CLI version against its applicable latest target.
 */
export interface VersionComparison {
  /**
   * Semver of the running CLI without display suffixes.
   */
  currentVersion: string;
  /**
   * Human-readable latest label shown on home and manage screens.
   */
  latestLabel: 'Up to date' | 'Checking…' | 'Unavailable' | string;
  /**
   * True when both sides are known and semver-equal.
   */
  isUpToDate: boolean;
  /**
   * Source used to resolve the latest applicable version.
   */
  comparisonTarget: VersionComparisonTarget;
}

/**
 * Injectable dependencies for version comparison read-model tests.
 */
export interface VersionComparisonDeps {
  /**
   * Resolves the latest published npm version for `spec-n-roll`.
   */
  fetchNpmLatestVersion?: () => Promise<string | null>;
  /**
   * Reads the semver from a linked source package root.
   */
  readLinkedSourceVersion?: (sourcePath: string) => string | null;
  /**
   * Reads the semver from the globally installed toolkit package.
   */
  readGlobalInstallVersion?: () => string | null;
}

/**
 * Options for reading the global install version from disk.
 */
export interface ReadGlobalInstallVersionOptions {
  /**
   * Directory containing the global CLI entrypoint. Defaults to the resolved global CLI directory.
   */
  globalCliDirectory?: string;
  /**
   * Environment variables used to inspect dispatcher delegation metadata.
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Normalizes a semver string to its major.minor.patch core for comparison.
 *
 * @param version - Semver string that may include prerelease or build metadata.
 * @returns Normalized `x.y.z` core or null when the input is not semver-like.
 */
function normalizeSemverCore(version: string): string | null {
  const match = version.match(/^(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

/**
 * Returns true when the candidate semver is strictly newer than the baseline semver.
 *
 * @param candidate - Semver that may be newer than the baseline.
 * @param baseline - Semver to compare against.
 * @returns True when both inputs are semver-like and candidate is greater than baseline.
 */
export function isVersionNewer(candidate: string, baseline: string): boolean {
  const candidateCore = normalizeSemverCore(candidate);
  const baselineCore = normalizeSemverCore(baseline);

  if (candidateCore == null || baselineCore == null) {
    return false;
  }

  const candidateParts = candidateCore.split('.').map(Number);
  const baselineParts = baselineCore.split('.').map(Number);

  for (let index = 0; index < 3; index += 1) {
    const candidatePart = candidateParts[index];
    const baselinePart = baselineParts[index];

    if (candidatePart == null || baselinePart == null) {
      return false;
    }

    if (candidatePart > baselinePart) {
      return true;
    }

    if (candidatePart < baselinePart) {
      return false;
    }
  }

  return false;
}

/**
 * Compares two semver strings and returns the display label and up-to-date flag.
 *
 * @param currentVersion - Running toolkit semver.
 * @param latestVersion - Latest applicable semver when known.
 * @returns Display label and equality flag for the pair.
 */
function buildComparisonResult(
  currentVersion: string,
  latestVersion: string | null,
  comparisonTarget: VersionComparisonTarget,
): VersionComparison {
  if (latestVersion == null) {
    return {
      currentVersion,
      latestLabel: 'Unavailable',
      isUpToDate: false,
      comparisonTarget,
    };
  }

  const currentCore = normalizeSemverCore(currentVersion);
  const latestCore = normalizeSemverCore(latestVersion);
  const isUpToDate = currentCore != null && latestCore != null && currentCore === latestCore;

  return {
    currentVersion,
    latestLabel: isUpToDate ? 'Up to date' : latestVersion,
    isUpToDate,
    comparisonTarget,
  };
}

/**
 * Fetches the latest published `spec-n-roll` version from the npm registry.
 *
 * @returns Latest published semver or null when the registry is unreachable.
 */
export async function fetchNpmLatestVersion(): Promise<string | null> {
  const result = spawnSync('npm', ['view', 'spec-n-roll', 'version', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0 || result.stdout.trim().length === 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(result.stdout.trim());
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (Array.isArray(parsed) && typeof parsed.at(-1) === 'string') {
      return parsed.at(-1) ?? null;
    }
  } catch {
    const trimmed = result.stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

/**
 * Reads the semver from a linked toolkit source package root.
 *
 * @param sourcePath - Absolute path to the linked toolkit package root.
 * @returns Toolkit semver or null when unreadable.
 */
export function readLinkedSourceVersion(sourcePath: string): string | null {
  try {
    return readToolkitVersionFromRoot(path.resolve(sourcePath));
  } catch {
    return null;
  }
}

/**
 * Reads the globally installed toolkit version from the package adjacent to the global CLI.
 *
 * @param options - Optional global CLI directory override for tests.
 * @returns Global toolkit semver or null when unreadable.
 */
export function readGlobalInstallVersion(
  options: ReadGlobalInstallVersionOptions = {},
): string | null {
  try {
    if (options.globalCliDirectory != null) {
      return readRuntimePackageVersion(path.resolve(options.globalCliDirectory));
    }

    const delegatedVersion = readDelegatedDispatcherVersion(options.env ?? process.env);
    if (delegatedVersion != null) {
      return delegatedVersion;
    }

    const globalCliPath = resolveGlobalCliPath();
    return readRuntimePackageVersion(path.dirname(globalCliPath));
  } catch {
    return null;
  }
}

/**
 * Reads the global dispatcher version passed to project-local CLI processes.
 *
 * @param env - Environment variables for the current process. Uses dispatcher metadata keys.
 * @returns Dispatcher semver when execution was delegated from the global dispatcher, otherwise null.
 */
export function readDelegatedDispatcherVersion(env: NodeJS.ProcessEnv): string | null {
  if (env.SPEC_N_ROLL_DISPATCHED !== '1') {
    return null;
  }

  const version = env.SPEC_N_ROLL_DISPATCHER_VERSION?.trim();
  return version != null && version.length > 0 ? version : null;
}

/**
 * Reads whether the delegating global dispatcher came from a linked source install.
 *
 * @param env - Environment variables for the current process. Uses dispatcher metadata keys.
 * @returns True when execution was delegated from a linked global dispatcher.
 */
export function readDelegatedDispatcherIsLinked(env: NodeJS.ProcessEnv): boolean {
  return (
    env.SPEC_N_ROLL_DISPATCHED === '1' && env.SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE === 'local'
  );
}

/**
 * Compares a global remote install against the npm registry latest version.
 *
 * @param currentVersion - Running global toolkit semver.
 * @param deps - Optional dependency overrides for tests.
 * @returns Version comparison for npm registry targets.
 */
export async function compareGlobalRemoteVersion(
  currentVersion: string,
  deps: VersionComparisonDeps = {},
): Promise<VersionComparison> {
  const fetchLatest = deps.fetchNpmLatestVersion ?? fetchNpmLatestVersion;
  const latestVersion = await fetchLatest();
  return buildComparisonResult(currentVersion, latestVersion, 'npm-registry');
}

/**
 * Compares a global linked install against the linked source package version.
 *
 * @param currentVersion - Running global toolkit semver.
 * @param sourcePath - Absolute linked source package root.
 * @param deps - Optional dependency overrides for tests.
 * @returns Version comparison for linked-source targets.
 */
export async function compareGlobalLinkedVersion(
  currentVersion: string,
  sourcePath: string,
  deps: VersionComparisonDeps = {},
): Promise<VersionComparison> {
  const readLinked = deps.readLinkedSourceVersion ?? readLinkedSourceVersion;
  const latestVersion = readLinked(sourcePath);
  return buildComparisonResult(currentVersion, latestVersion, 'linked-source');
}

/**
 * Compares a project-local install against the globally installed toolkit version.
 *
 * @param currentVersion - Running local toolkit semver.
 * @param deps - Optional dependency overrides for tests.
 * @returns Version comparison for global-install targets.
 */
export async function compareLocalToGlobalVersion(
  currentVersion: string,
  deps: VersionComparisonDeps = {},
): Promise<VersionComparison> {
  const readGlobal = deps.readGlobalInstallVersion ?? readGlobalInstallVersion;
  const latestVersion = readGlobal();
  return buildComparisonResult(currentVersion, latestVersion, 'global-install');
}
