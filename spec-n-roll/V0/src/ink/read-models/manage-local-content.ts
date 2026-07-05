import type { StaticContentField } from '../components/StaticContentBlock.js';
import { readToolkitPackageVersion } from '../../cli/commands/version.js';
import {
  compareLocalToGlobalVersion,
  isVersionNewer,
  readDelegatedDispatcherIsLinked,
  readGlobalInstallVersion,
  type VersionComparison,
  type VersionComparisonDeps,
} from './version-comparison.js';
import { readGlobalInstallSource, type InstallSource } from './install-source.js';

/**
 * Loaded content and menu enablement for the local manage screen.
 */
export interface ManageLocalContent {
  /**
   * Ordered static fields for the manage screen content area.
   */
  fields: readonly StaticContentField[];
  /**
   * Resolved global install source metadata for refresh actions.
   */
  globalInstallSource: InstallSource;
  /**
   * Version comparison used to derive refresh and update enablement for npm globals.
   */
  versionComparison: VersionComparison;
  /**
   * Semver of the running local CLI without display suffixes.
   */
  localVersion: string;
  /**
   * Semver of the globally installed toolkit when readable.
   */
  globalVersion: string | null;
  /**
   * Whether the Refresh Project Spec N' Roll menu option should be disabled.
   */
  refreshProjectDisabled: boolean;
  /**
   * Whether the Update Project menu option should be disabled.
   */
  updateProjectDisabled: boolean;
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
 * Input for loading manage-local read-model content.
 */
export interface LoadManageLocalContentInput {
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
 * Injectable dependencies for manage-local read-model tests.
 */
export interface LoadManageLocalContentDeps {
  /**
   * Optional running toolkit version reader override.
   */
  readCurrentVersion?: () => string;
  /**
   * Optional version comparison dependency overrides.
   */
  versionComparisonDeps?: VersionComparisonDeps;
  /**
   * Optional global install source reader override.
   */
  readGlobalInstallSource?: (env: NodeJS.ProcessEnv) => InstallSource;
  /**
   * Optional process environment override for delegated global install detection.
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Returns true when the delegating global CLI came from a linked npm source install.
 *
 * @param globalInstallSource - Resolved global install source metadata.
 * @param env - Environment variables for the current process.
 * @returns True when refresh and update actions should ignore version equality checks.
 */
function isGlobalInstallLinked(
  globalInstallSource: InstallSource,
  env: NodeJS.ProcessEnv,
): boolean {
  return globalInstallSource.kind === 'local' || readDelegatedDispatcherIsLinked(env);
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
 * Builds static content fields for the manage-local screen.
 *
 * @param projectRoot - Absolute project root for display.
 * @param globalVersion - Globally installed toolkit semver when readable.
 * @param localVersion - Running local toolkit semver.
 * @returns Ordered static content fields.
 */
function buildManageLocalFields(
  projectRoot: string,
  globalVersion: string | null,
  localVersion: string,
): readonly StaticContentField[] {
  return [
    { label: 'Global Version', value: formatVersionValue(globalVersion) },
    { label: 'Local Version', value: formatVersionValue(localVersion) },
    { label: 'Project', value: projectRoot },
  ];
}

/**
 * Loads static content and menu enablement for the local manage screen.
 *
 * @param input - Project root and initialization state for the active session.
 * @param deps - Optional dependency overrides for tests.
 * @returns Manage screen content fields and menu enablement flags.
 */
export async function loadManageLocalContent(
  input: LoadManageLocalContentInput,
  deps: LoadManageLocalContentDeps = {},
): Promise<ManageLocalContent> {
  const env = deps.env ?? process.env;
  const readVersion = deps.readCurrentVersion ?? readToolkitPackageVersion;
  const readGlobalSource = deps.readGlobalInstallSource ?? readGlobalInstallSource;
  const readGlobalVersion =
    deps.versionComparisonDeps?.readGlobalInstallVersion ?? readGlobalInstallVersion;
  const localVersion = readVersion();
  const globalInstallSource = readGlobalSource(env);
  const globalVersion = readGlobalVersion({ env });
  const versionComparison = await compareLocalToGlobalVersion(
    localVersion,
    deps.versionComparisonDeps,
  );

  const globalInstallIsLinked = isGlobalInstallLinked(globalInstallSource, env);
  const refreshProjectDisabled =
    !globalInstallIsLinked &&
    (globalVersion == null || !isVersionNewer(globalVersion, localVersion));

  const updateProjectDisabled = refreshProjectDisabled;
  const removeDisabled = !input.isInitialized;
  const reinstallDisabled = !input.isInitialized;

  return {
    fields: buildManageLocalFields(input.projectRoot, globalVersion, localVersion),
    globalInstallSource,
    versionComparison,
    localVersion,
    globalVersion,
    refreshProjectDisabled,
    updateProjectDisabled,
    removeDisabled,
    reinstallDisabled,
  };
}
