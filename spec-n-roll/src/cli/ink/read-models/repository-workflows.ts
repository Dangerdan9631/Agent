import path from 'node:path';

import fse from 'fs-extra';

import {
  parseRepositoryWorkflowReportSectionHeadings,
  parseSpecifyOutputRefFromReport,
  parseWorkflowTypeNameFromReport,
  REPOSITORY_WORKFLOW_REPORT_FILENAME,
  repositoryWorkflowReportRelativePath,
} from '../../../sdk/repository/report.js';
import { listTaskSpecSummaries } from './task-specs.js';

/**
 * Directory name pattern for task spec identities.
 */
const TASK_SPEC_DIRECTORY_PATTERN = /^(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * Read-only summary of one repository workflow report artifact.
 */
export interface RepositoryWorkflowReportSummary {
  /**
   * Zero-padded numeric task spec id parsed from the directory name.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug parsed from the directory name.
   */
  slug: string;
  /**
   * Full basename of the task spec directory under `specs/`.
   */
  directoryName: string;
  /**
   * Project-relative path to the report artifact.
   */
  reportPath: string;
  /**
   * True when the report artifact exists on disk.
   */
  hasReport: boolean;
  /**
   * Human-readable workflow type label parsed from the report scope section.
   */
  workflowTypeName: string | null;
  /**
   * Project-relative path to the linked specify output when present in the report.
   */
  specifyOutputRef: string | null;
  /**
   * Level-2 section headings parsed from the report markdown.
   */
  sectionHeadings: readonly string[];
}

/**
 * Parses a task spec directory name into id and slug components.
 *
 * @param directoryName - Basename of a directory under `specs/`.
 * @returns Parsed task spec identity or null when the name is invalid.
 */
function parseTaskSpecDirectoryName(
  directoryName: string,
): { taskSpecId: string; slug: string } | null {
  const match = TASK_SPEC_DIRECTORY_PATTERN.exec(directoryName);
  if (match == null) {
    return null;
  }

  return {
    taskSpecId: match[1] ?? '',
    slug: match[2] ?? '',
  };
}

/**
 * Assembles a repository workflow report summary for one task spec directory.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param directoryName - Task spec directory basename under `specs/`.
 * @returns Parsed report summary for Ink list and detail screens.
 */
export async function assembleRepositoryWorkflowReportSummary(
  projectRoot: string,
  directoryName: string,
): Promise<RepositoryWorkflowReportSummary> {
  const identity = parseTaskSpecDirectoryName(directoryName);
  if (identity == null) {
    return {
      taskSpecId: '',
      slug: '',
      directoryName,
      reportPath: '',
      hasReport: false,
      workflowTypeName: null,
      specifyOutputRef: null,
      sectionHeadings: [],
    };
  }

  const reportPath = repositoryWorkflowReportRelativePath(identity.taskSpecId, identity.slug);
  const absoluteReportPath = path.join(
    projectRoot,
    'specs',
    directoryName,
    REPOSITORY_WORKFLOW_REPORT_FILENAME,
  );
  const hasReport = await fse.pathExists(absoluteReportPath);

  if (!hasReport) {
    return {
      taskSpecId: identity.taskSpecId,
      slug: identity.slug,
      directoryName,
      reportPath,
      hasReport: false,
      workflowTypeName: null,
      specifyOutputRef: null,
      sectionHeadings: [],
    };
  }

  const markdown = await fse.readFile(absoluteReportPath, 'utf8');

  return {
    taskSpecId: identity.taskSpecId,
    slug: identity.slug,
    directoryName,
    reportPath,
    hasReport: true,
    workflowTypeName: parseWorkflowTypeNameFromReport(markdown),
    specifyOutputRef: parseSpecifyOutputRefFromReport(markdown),
    sectionHeadings: parseRepositoryWorkflowReportSectionHeadings(markdown),
  };
}

/**
 * Lists repository workflow report summaries for recognized task specs that have reports.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Report summaries sorted by numeric task spec id.
 */
export async function listRepositoryWorkflowReportSummaries(
  projectRoot: string,
): Promise<RepositoryWorkflowReportSummary[]> {
  const taskSpecs = await listTaskSpecSummaries(projectRoot);
  const summaries = await Promise.all(
    taskSpecs.recognized.map((summary) =>
      assembleRepositoryWorkflowReportSummary(projectRoot, summary.directoryName),
    ),
  );

  return summaries
    .filter((summary) => summary.hasReport)
    .sort((left, right) => left.taskSpecId.localeCompare(right.taskSpecId));
}
