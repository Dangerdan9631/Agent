import path from 'node:path';

import fse from 'fs-extra';
import { injectable } from 'tsyringe';

import {
  parseRepositoryWorkflowReportSectionHeadings,
  parseSpecifyOutputRefFromReport,
  parseWorkflowTypeNameFromReport,
  readRepositoryWorkflowReport,
  REPOSITORY_WORKFLOW_REPORT_FILENAME,
  repositoryWorkflowReportRelativePath,
  type RepositoryWorkflowReportReadResult,
} from '../repository/report.js';

/**
 * Directory name pattern for task spec identities.
 */
const TASK_SPEC_DIRECTORY_PATTERN = /^(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * Minimal task spec directory summary needed to locate repository workflow reports.
 */
export interface RepositoryWorkflowTaskSpecDirectory {
  /**
   * Full basename of a directory under `specs/`. It should be a candidate task spec identity.
   */
  directoryName: string;
}

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
export function parseRepositoryWorkflowTaskSpecDirectoryName(
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
 * Loads repository workflow report summaries for interactive display.
 */
@injectable()
export class RepositoryWorkflowReportViewService {
  /**
   * Assembles a repository workflow report summary for one task spec directory.
   *
   * @param projectRoot - Absolute path to the project root.
   * @param directoryName - Task spec directory basename under `specs/`.
   * @returns Parsed report summary for interactive list and detail screens.
   */
  async assembleReportSummary(
    projectRoot: string,
    directoryName: string,
  ): Promise<RepositoryWorkflowReportSummary> {
    const identity = parseRepositoryWorkflowTaskSpecDirectoryName(directoryName);
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
   * @param taskSpecs - Recognized task spec directories sorted by the caller.
   * @returns Report summaries sorted by numeric task spec id.
   */
  async listReportSummaries(
    projectRoot: string,
    taskSpecs: readonly RepositoryWorkflowTaskSpecDirectory[],
  ): Promise<RepositoryWorkflowReportSummary[]> {
    const summaries = await Promise.all(
      taskSpecs.map((summary) => this.assembleReportSummary(projectRoot, summary.directoryName)),
    );

    return summaries
      .filter((summary) => summary.hasReport)
      .sort((left, right) => left.taskSpecId.localeCompare(right.taskSpecId));
  }

  /**
   * Reads a repository workflow report artifact for detail display.
   *
   * @param projectRoot - Absolute path to the project root.
   * @param taskSpecId - Zero-padded numeric task spec id.
   * @param slug - Kebab-case slug paired with the task spec id.
   * @returns Parsed report read result with markdown content and metadata.
   */
  async readReport(
    projectRoot: string,
    taskSpecId: string,
    slug: string,
  ): Promise<RepositoryWorkflowReportReadResult> {
    return readRepositoryWorkflowReport(projectRoot, taskSpecId, slug);
  }
}
