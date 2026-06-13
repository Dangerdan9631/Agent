import type { StaticContentField } from '../components/StaticContentBlock.js';
import { readToolkitPackageVersion } from '../../commands/version.js';
import {
  compareGlobalLinkedVersion,
  compareGlobalRemoteVersion,
  type VersionComparison,
  type VersionComparisonDeps,
} from './version-comparison.js';
import { readInstallSource, type InstallSource, type ReadInstallSourceOptions } from './install-source.js';

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
   * Version comparison used to derive latest-version display and update enablement.
   */
  versionComparison: VersionComparison;
  /**
   * Whether the Update Spec N' Roll menu option should be disabled.
   */
  updateDisabled: boolean;
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
   * Optional version comparison dependency overrides.
   */
  versionComparisonDeps?: VersionComparisonDeps;
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
 * Formats the latest-version label for the global home content area.
 *
 * @param comparison - Resolved version comparison for the running global CLI.
 * @returns Human-readable latest-version label.
 */
function formatLatestVersionLabel(comparison: VersionComparison): string {
  if (
    comparison.latestLabel === 'Up to date' ||
    comparison.latestLabel === 'Checking…' ||
    comparison.latestLabel === 'Unavailable'
  ) {
    return comparison.latestLabel;
  }

  return `v${comparison.latestLabel}`;
}

/**
 * Builds static content fields for the global home screen.
 *
 * @param input - Project context for the current session.
 * @param installSource - Resolved install source metadata.
 * @param comparison - Resolved version comparison for the running global CLI.
 * @returns Ordered static content fields.
 */
function buildGlobalHomeFields(
  input: LoadGlobalHomeContentInput,
  installSource: InstallSource,
  comparison: VersionComparison,
): readonly StaticContentField[] {
  return [
    { label: 'Install Source', value: formatInstallSourceValue(installSource) },
    { label: 'Version', value: `v${comparison.currentVersion} (global)` },
    { label: 'Latest Version', value: formatLatestVersionLabel(comparison) },
    { label: 'Project', value: input.projectRoot },
    {
      label: 'Project Status',
      value: input.isInitialized ? 'Initialized' : 'Not initialized',
    },
  ];
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
  const installSource = readSource();
  const currentVersion = readVersion();

  const versionComparison =
    installSource.kind === 'local' && installSource.sourcePath != null
      ? await compareGlobalLinkedVersion(
          currentVersion,
          installSource.sourcePath,
          deps.versionComparisonDeps,
        )
      : await compareGlobalRemoteVersion(currentVersion, deps.versionComparisonDeps);

  const updateDisabled = installSource.kind === 'remote' && versionComparison.isUpToDate;
  const removeDisabled = !input.isInitialized;
  const reinstallDisabled = !input.isInitialized;

  return {
    fields: buildGlobalHomeFields(input, installSource, versionComparison),
    installSource,
    versionComparison,
    updateDisabled,
    removeDisabled,
    reinstallDisabled,
  };
}
