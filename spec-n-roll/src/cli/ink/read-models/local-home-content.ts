import type { StaticContentField } from '../components/StaticContentBlock.js';
import { readToolkitPackageVersion } from '../../commands/version.js';
import { readProjectMetadata } from '../../../core/project-metadata.js';
import { readTaskMetadata } from '../../../core/task-metadata.js';
import { readWorkflowState } from '../../../core/workflow-state.js';
import {
  compareLocalToGlobalVersion,
  type VersionComparison,
  type VersionComparisonDeps,
} from './version-comparison.js';

/**
 * Loaded content blocks for the local instance home screen.
 */
export interface LocalHomeContent {
  /**
   * Version and project context fields always shown at the top of local home.
   */
  versionBlock: readonly StaticContentField[];
  /**
   * Next-task and metadata timestamp fields when project metadata is readable.
   */
  taskSummaryBlock: readonly StaticContentField[] | null;
  /**
   * Active current-task fields when implement is in progress.
   */
  currentTaskBlock: readonly StaticContentField[] | null;
  /**
   * Version comparison used to derive latest-version display.
   */
  versionComparison: VersionComparison;
}

/**
 * Input for loading local home read-model content.
 */
export interface LoadLocalHomeContentInput {
  /**
   * Absolute path to the detected project directory.
   */
  projectRoot: string;
}

/**
 * Injectable dependencies for local home read-model tests.
 */
export interface LoadLocalHomeContentDeps {
  /**
   * Optional running toolkit version reader override.
   */
  readCurrentVersion?: () => string;
  /**
   * Optional project metadata reader override.
   */
  readProjectMetadata?: (projectRoot: string) => Promise<Awaited<ReturnType<typeof readProjectMetadata>>>;
  /**
   * Optional task metadata reader override.
   */
  readTaskMetadata?: typeof readTaskMetadata;
  /**
   * Optional workflow state reader override.
   */
  readWorkflowState?: typeof readWorkflowState;
  /**
   * Optional version comparison dependency overrides.
   */
  versionComparisonDeps?: VersionComparisonDeps;
}

/**
 * Formats an ISO-8601 timestamp for local home display.
 *
 * @param iso - ISO-8601 datetime string stored in metadata files.
 * @returns Timestamp formatted as `HH:mm:ss YYYY-MM-DD` in UTC.
 */
function formatDisplayTimestamp(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} ${year}-${month}-${day}`;
}

/**
 * Converts a kebab-case slug into title case for display.
 *
 * @param slug - Kebab-case task spec slug.
 * @returns Title-cased words separated by spaces.
 */
function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

/**
 * Formats the latest-version label for the local home content area.
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
 * Returns whether implement has finished for the current task workflow state.
 *
 * @param workflowState - Workflow state for the current task spec, if readable.
 * @returns True when implement completed successfully.
 */
function isImplementComplete(
  workflowState: Awaited<ReturnType<typeof readWorkflowState>>,
): boolean {
  return (
    workflowState?.lastCompletedStepId === 'implement' && workflowState.status === 'complete'
  );
}

/**
 * Builds the version block shown at the top of local home.
 *
 * @param projectRoot - Absolute project root for display.
 * @param comparison - Resolved version comparison for the running local CLI.
 * @returns Ordered static content fields for block one.
 */
function buildVersionBlock(
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
 * Builds the task summary block from project metadata.
 *
 * @param metadata - Readable project metadata for the active project.
 * @returns Ordered static content fields for block two.
 */
function buildTaskSummaryBlock(
  metadata: NonNullable<Awaited<ReturnType<typeof readProjectMetadata>>>,
): readonly StaticContentField[] {
  return [
    { label: 'Next task spec id', value: String(metadata.nextTaskSpecId) },
    { label: 'Updated at', value: formatDisplayTimestamp(metadata.updatedAt) },
  ];
}

/**
 * Builds the optional current-task block from project and task metadata.
 *
 * @param projectRoot - Absolute project root for task metadata lookup.
 * @param taskSpecId - Current task spec id from project metadata.
 * @param slug - Current task slug from project metadata.
 * @param deps - Injectable readers for tests.
 * @returns Current-task fields or null when the block should be omitted.
 */
async function buildCurrentTaskBlock(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  deps: Required<
    Pick<LoadLocalHomeContentDeps, 'readTaskMetadata' | 'readWorkflowState'>
  >,
): Promise<readonly StaticContentField[] | null> {
  const workflowState = await deps.readWorkflowState(projectRoot, taskSpecId, slug);
  if (isImplementComplete(workflowState)) {
    return null;
  }

  const taskMetadata = await deps.readTaskMetadata(projectRoot, taskSpecId, slug);
  const fields: StaticContentField[] = [
    {
      label: 'Current task',
      value: `${taskSpecId} ${titleCaseSlug(slug)}`,
    },
  ];

  if (taskMetadata?.createdAt != null) {
    fields.push({
      label: 'Created at',
      value: formatDisplayTimestamp(taskMetadata.createdAt),
    });
  }

  if (taskMetadata?.implementationStartedAt != null) {
    fields.push({
      label: 'Implementation started at',
      value: formatDisplayTimestamp(taskMetadata.implementationStartedAt),
    });
  }

  return fields;
}

/**
 * Loads static content blocks for the local instance home screen.
 *
 * @param input - Project root for the active session.
 * @param deps - Optional dependency overrides for tests.
 * @returns Local home content blocks and version comparison metadata.
 */
export async function loadLocalHomeContent(
  input: LoadLocalHomeContentInput,
  deps: LoadLocalHomeContentDeps = {},
): Promise<LocalHomeContent> {
  const readVersion = deps.readCurrentVersion ?? readToolkitPackageVersion;
  const readMetadata = deps.readProjectMetadata ?? readProjectMetadata;
  const readTaskMeta = deps.readTaskMetadata ?? readTaskMetadata;
  const readWorkflow = deps.readWorkflowState ?? readWorkflowState;

  const currentVersion = readVersion();
  const versionComparison = await compareLocalToGlobalVersion(
    currentVersion,
    deps.versionComparisonDeps,
  );

  const metadata = await readMetadata(input.projectRoot);
  const versionBlock = buildVersionBlock(input.projectRoot, versionComparison);

  if (metadata == null) {
    return {
      versionBlock,
      taskSummaryBlock: null,
      currentTaskBlock: null,
      versionComparison,
    };
  }

  const taskSummaryBlock = buildTaskSummaryBlock(metadata);

  const currentTaskSpecId = metadata.currentTaskSpecId;
  const currentTaskSlug = metadata.currentTaskSlug;
  const currentTaskBlock =
    currentTaskSpecId != null && currentTaskSlug != null
      ? await buildCurrentTaskBlock(input.projectRoot, currentTaskSpecId, currentTaskSlug, {
          readTaskMetadata: readTaskMeta,
          readWorkflowState: readWorkflow,
        })
      : null;

  return {
    versionBlock,
    taskSummaryBlock,
    currentTaskBlock,
    versionComparison,
  };
}
