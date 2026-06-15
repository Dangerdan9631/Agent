import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { StaticContentField } from '../components/StaticContentBlock.js';
import { findLocalCli } from '../../dispatcher.js';
import { LOCAL_CLI_ROOT_RELATIVE_PATH } from '../../../sdk/install/local-install-integrity.js';
import { readToolkitPackageVersion } from '../../commands/version.js';
import {
  compareGlobalLinkedVersion,
  compareGlobalRemoteVersion,
  isVersionNewer,
  type VersionComparison,
  type VersionComparisonDeps,
} from './version-comparison.js';
import {
  readInstallSource,
  type InstallSource,
  type ReadInstallSourceOptions,
} from './install-source.js';

/**
 * Loaded content and menu enablement for the global instance home screen.
 */
export interface GlobalHomeContent {
  /**
   * Ordered static fields for the global home content area.
   */
  fields: readonly StaticContentField[];
  /**
   * Resolved install source metadata for update actions.
   */
  installSource: InstallSource;
  /**
   * Version comparison used to derive global update enablement for npm installs.
   */
  versionComparison: VersionComparison;
  /**
   * Semver of the running global CLI without display suffixes.
   */
  globalVersion: string;
  /**
   * Semver of the project-local CLI when installed, otherwise null.
   */
  localVersion: string | null;
  /**
   * Whether the Update Global Spec N' Roll menu option should be disabled.
   */
  updateGlobalDisabled: boolean;
  /**
   * Whether the Refresh Project Spec N' Roll menu option should be disabled.
   */
  refreshProjectDisabled: boolean;
  /**
   * Whether the Update Project menu option should be disabled.
   */
  updateProjectDisabled: boolean;
  /**
   * Whether project refresh and update actions should be shown on the global home menu.
   */
  showProjectUpdateActions: boolean;
  /**
   * Whether the Remove Spec N' Roll menu option should be disabled.
   */
  removeDisabled: boolean;
  /**
   * Whether the Re-install Spec N' Roll menu option should be disabled.
   */
  reinstallDisabled: boolean;
}

/**
 * Input for loading global home read-model content.
 */
export interface LoadGlobalHomeContentInput {
  /**
   * Absolute path to the detected project directory.
   */
  projectRoot: string;
  /**
   * Whether workflow configuration was readable when the session launched.
   */
  isInitialized: boolean;
}

/**
 * Injectable dependencies for global home read-model tests.
 */
export interface LoadGlobalHomeContentDeps {
  /**
   * Optional install source reader override.
   */
  readInstallSource?: (options?: ReadInstallSourceOptions) => InstallSource;
  /**
   * Optional running toolkit version reader override.
   */
  readCurrentVersion?: () => string;
  /**
   * Optional project-local toolkit version reader override.
   */
  readLocalProjectVersion?: (projectRoot: string) => string | null;
  /**
   * Optional version comparison dependency overrides.
   */
  versionComparisonDeps?: VersionComparisonDeps;
}

/**
 * Reads the project-local Spec-N-Roll package version when the local bundle metadata exists.
 *
 * @param projectRoot - Absolute project root that may contain `.spec-n-roll/cli/package.json`.
 * @returns Semver string from the local package descriptor, or null when it is absent or invalid.
 */
export function readLocalProjectPackageVersion(projectRoot: string): string | null {
  const packageJsonPath = path.join(projectRoot, LOCAL_CLI_ROOT_RELATIVE_PATH, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      name?: unknown;
      version?: unknown;
    };

    if (packageJson.name === 'spec-n-roll' && typeof packageJson.version === 'string') {
      return packageJson.version;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Formats a semver string for version display fields.
 *
 * @param version - Semver string to display, or null when unavailable.
 * @returns Display value prefixed with `v`, or `Unavailable` when the version is unknown.
 */
function formatVersionValue(version: string | null): string {
  if (version == null) {
    return 'Unavailable';
  }

  return `v${version}`;
}

/**
 * Formats install source metadata for the global home content area.
 *
 * @param installSource - Resolved install source metadata.
 * @returns Display value for the Install Source field.
 */
function formatInstallSourceValue(installSource: InstallSource): string {
  if (installSource.kind === 'local' && installSource.sourcePath != null) {
    return `Local (${installSource.sourcePath})`;
  }

  return 'Remote';
}

/**
 * Builds static content fields for the global home screen.
 *
 * @param input - Project context for the current session.
 * @param installSource - Resolved install source metadata.
 * @param globalVersion - Running global toolkit semver.
 * @param localVersion - Project-local toolkit semver when installed.
 * @returns Ordered static content fields.
 */
function buildGlobalHomeFields(
  input: LoadGlobalHomeContentInput,
  installSource: InstallSource,
  globalVersion: string,
  localVersion: string | null,
): readonly StaticContentField[] {
  return [
    { label: 'Install Source', value: formatInstallSourceValue(installSource) },
    { label: 'Global Version', value: formatVersionValue(globalVersion) },
    { label: 'Local Version', value: formatVersionValue(localVersion) },
    { label: 'Project', value: input.projectRoot },
    {
      label: 'Project Status',
      value: input.isInitialized ? 'Initialized' : 'Not initialized',
    },
  ];
}

/**
 * Resolves whether project refresh and update actions should be enabled for npm-sourced globals.
 *
 * @param globalVersion - Running global toolkit semver.
 * @param localVersion - Project-local toolkit semver when installed.
 * @returns True when the global version is strictly newer than the local version.
 */
function isNpmSourcedProjectRefreshEnabled(
  globalVersion: string,
  localVersion: string | null,
): boolean {
  if (localVersion == null) {
    return false;
  }

  return isVersionNewer(globalVersion, localVersion);
}

/**
 * Loads static content and menu enablement for the global instance home screen.
 *
 * @param input - Project root and initialization state for the active session.
 * @param deps - Optional dependency overrides for tests.
 * @returns Global home content fields and menu enablement flags.
 */
export async function loadGlobalHomeContent(
  input: LoadGlobalHomeContentInput,
  deps: LoadGlobalHomeContentDeps = {},
): Promise<GlobalHomeContent> {
  const readSource = deps.readInstallSource ?? readInstallSource;
  const readVersion = deps.readCurrentVersion ?? readToolkitPackageVersion;
  const readLocalVersion = deps.readLocalProjectVersion ?? readLocalProjectPackageVersion;
  const installSource = readSource();
  const globalVersion = readVersion();
  const localVersion = readLocalVersion(input.projectRoot);
  const hasLocalProjectInstall = findLocalCli(input.projectRoot) != null;
  const showProjectUpdateActions = input.isInitialized && hasLocalProjectInstall;

  const versionComparison =
    installSource.kind === 'local' && installSource.sourcePath != null
      ? await compareGlobalLinkedVersion(
          globalVersion,
          installSource.sourcePath,
          deps.versionComparisonDeps,
        )
      : await compareGlobalRemoteVersion(globalVersion, deps.versionComparisonDeps);

  const updateGlobalDisabled =
    installSource.kind === 'remote' &&
    (versionComparison.latestLabel === 'Unavailable' ||
      versionComparison.latestLabel === 'Checking…' ||
      !isVersionNewer(versionComparison.latestLabel, globalVersion));

  const refreshProjectDisabled =
    !showProjectUpdateActions ||
    (installSource.kind === 'remote' &&
      !isNpmSourcedProjectRefreshEnabled(globalVersion, localVersion));

  const updateProjectDisabled = refreshProjectDisabled;
  const removeDisabled = !input.isInitialized;
  const reinstallDisabled = !input.isInitialized;

  return {
    fields: buildGlobalHomeFields(input, installSource, globalVersion, localVersion),
    installSource,
    versionComparison,
    globalVersion,
    localVersion,
    updateGlobalDisabled,
    refreshProjectDisabled,
    updateProjectDisabled,
    showProjectUpdateActions,
    removeDisabled,
    reinstallDisabled,
  };
}
