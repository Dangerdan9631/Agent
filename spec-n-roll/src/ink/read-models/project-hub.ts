import type { StaticContentField } from '../components/StaticContentBlock.js';
import {
  listTaskSpecSummaries,
  type TaskSpecLifecycleStatusView,
  type TaskSpecSummary,
} from './task-specs.js';

/**
 * Most recent recognized task spec shown on the project hub.
 */
export interface ProjectHubMostRecentSpec {
  /**
   * Full basename of the task spec directory under `specs/`.
   */
  directoryName: string;
  /**
   * Zero-padded numeric task spec id.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Lifecycle status from spec frontmatter, or `unknown` when absent.
   */
  lifecycleStatus: TaskSpecLifecycleStatusView;
  /**
   * Operational workflow status from workflow state, or `missing` when absent.
   */
  operationalStatus: TaskSpecSummary['operationalStatus'];
}

/**
 * Aggregated project hub summary for the Project screen content area.
 */
export interface ProjectHubView {
  /**
   * Recognized spec with the highest numeric id, if any exist.
   */
  mostRecentSpec: ProjectHubMostRecentSpec | null;
  /**
   * Count of recognized specs grouped by lifecycle status.
   */
  statusCounts: Partial<Record<TaskSpecLifecycleStatusView, number>>;
  /**
   * Total count of recognized task spec directories.
   */
  totalSpecCount: number;
  /**
   * Static content fields rendered in the project hub summary area.
   */
  summaryBlock: readonly StaticContentField[];
}

/**
 * Input for loading project hub read-model content.
 */
export interface LoadProjectHubViewInput {
  /**
   * Absolute path to the detected project directory.
   */
  projectRoot: string;
}

/**
 * Injectable dependencies for project hub read-model tests.
 */
export interface LoadProjectHubViewDeps {
  /**
   * Optional task spec summary list reader override.
   */
  listTaskSpecSummaries?: typeof listTaskSpecSummaries;
}

/**
 * Display order for lifecycle status count lines on the project hub.
 */
const STATUS_COUNT_DISPLAY_ORDER: readonly TaskSpecLifecycleStatusView[] = [
  'Active',
  'Complete',
  'Locked',
  'unknown',
];

/**
 * Picks the recognized spec with the highest numeric task spec id.
 *
 * @param recognized - Recognized task spec summaries sorted by id.
 * @returns Most recent spec summary or null when none exist.
 */
function pickMostRecentSpec(
  recognized: readonly TaskSpecSummary[],
): ProjectHubMostRecentSpec | null {
  if (recognized.length === 0) {
    return null;
  }

  const mostRecent = recognized.reduce((latest, candidate) =>
    (candidate.taskSpecId ?? '').localeCompare(latest.taskSpecId ?? '', undefined, {
      numeric: true,
    }) > 0
      ? candidate
      : latest,
  );

  if (mostRecent.taskSpecId == null || mostRecent.slug == null) {
    return null;
  }

  return {
    directoryName: mostRecent.directoryName,
    taskSpecId: mostRecent.taskSpecId,
    slug: mostRecent.slug,
    lifecycleStatus: mostRecent.lifecycleStatus,
    operationalStatus: mostRecent.operationalStatus,
  };
}

/**
 * Aggregates lifecycle status counts for recognized task spec directories.
 *
 * @param recognized - Recognized task spec summaries.
 * @returns Partial map of lifecycle status to occurrence count.
 */
function aggregateStatusCounts(
  recognized: readonly TaskSpecSummary[],
): Partial<Record<TaskSpecLifecycleStatusView, number>> {
  const counts: Partial<Record<TaskSpecLifecycleStatusView, number>> = {};

  for (const summary of recognized) {
    const status = summary.lifecycleStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return counts;
}

/**
 * Builds static content fields for the project hub summary area.
 *
 * @param mostRecentSpec - Most recent recognized spec, if any.
 * @param statusCounts - Lifecycle status counts for recognized specs.
 * @param totalSpecCount - Total recognized spec count.
 * @returns Ordered static content fields for display.
 */
function buildSummaryBlock(
  mostRecentSpec: ProjectHubMostRecentSpec | null,
  statusCounts: Partial<Record<TaskSpecLifecycleStatusView, number>>,
  totalSpecCount: number,
): readonly StaticContentField[] {
  const fields: StaticContentField[] = [
    {
      label: 'Most recent spec',
      value:
        mostRecentSpec == null
          ? 'none'
          : `${mostRecentSpec.directoryName} (${mostRecentSpec.lifecycleStatus})`,
    },
  ];

  for (const status of STATUS_COUNT_DISPLAY_ORDER) {
    const count = statusCounts[status];
    if (count != null && count > 0) {
      fields.push({ label: status, value: String(count) });
    }
  }

  fields.push({ label: 'Total specs', value: String(totalSpecCount) });

  return fields;
}

/**
 * Loads aggregated project hub summary content for the Project screen.
 *
 * @param input - Project root for the active session.
 * @param deps - Optional dependency overrides for tests.
 * @returns Project hub view with most recent spec, status counts, and summary fields.
 */
export async function loadProjectHubView(
  input: LoadProjectHubViewInput,
  deps: LoadProjectHubViewDeps = {},
): Promise<ProjectHubView> {
  const listSummaries = deps.listTaskSpecSummaries ?? listTaskSpecSummaries;
  const { recognized } = await listSummaries(input.projectRoot);

  const mostRecentSpec = pickMostRecentSpec(recognized);
  const statusCounts = aggregateStatusCounts(recognized);
  const totalSpecCount = recognized.length;
  const summaryBlock = buildSummaryBlock(mostRecentSpec, statusCounts, totalSpecCount);

  return {
    mostRecentSpec,
    statusCounts,
    totalSpecCount,
    summaryBlock,
  };
}
