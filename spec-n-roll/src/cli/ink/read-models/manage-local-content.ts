import type { StaticContentField } from '../components/StaticContentBlock.js';
import { readToolkitPackageVersion } from '../../commands/version.js';
import {
  compareLocalToGlobalVersion,
  type VersionComparison,
  type VersionComparisonDeps,
} from './version-comparison.js';

/**
 * Loaded content and menu enablement for the local manage screen.
 */
export interface ManageLocalContent {
  /**
   * Ordered static fields for the manage screen content area.
   */
  fields: readonly StaticContentField[];
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
}

/**
 * Formats the latest-version label for the manage screen content area.
 *
 * @param comparison - Resolved version comparison for the running local CLI.
 * @returns Human-readable latest-version label.
 */
function formatLatestVersionLabel(comparison: VersionComparison): string {
  if (comparison.latestLabel === 'Up to date' || comparison.latestLabel === 'Unavailable') {
    return comparison.latestLabel;
  }

  return `v${comparison.latestLabel}`;
}

/**
 * Builds static content fields for the manage-local screen.
 *
 * @param projectRoot - Absolute project root for display.
 * @param comparison - Resolved version comparison for the running local CLI.
 * @returns Ordered static content fields.
 */
function buildManageLocalFields(
  projectRoot: string,
  comparison: VersionComparison,
): readonly StaticContentField[] {
  return [
    { label: 'Version', value: `v${comparison.currentVersion} (local)` },
    { label: 'Latest Version', value: formatLatestVersionLabel(comparison) },
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
  const readVersion = deps.readCurrentVersion ?? readToolkitPackageVersion;
  const currentVersion = readVersion();
  const versionComparison = await compareLocalToGlobalVersion(
    currentVersion,
    deps.versionComparisonDeps,
  );

  const updateDisabled = versionComparison.isUpToDate;
  const removeDisabled = !input.isInitialized;
  const reinstallDisabled = !input.isInitialized;

  return {
    fields: buildManageLocalFields(input.projectRoot, versionComparison),
    versionComparison,
    updateDisabled,
    removeDisabled,
    reinstallDisabled,
  };
}
