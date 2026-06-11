import fse from 'fs-extra';

import { parseFrontmatterDocument } from '../core/frontmatter.js';
import { taskSpecFilePath } from '../core/paths.js';
import type { InterviewSession } from './interview.js';
import { isInterviewComplete } from './interview.js';

const PLACEHOLDER_PATTERN = /<!--\s*FILL:/i;

/**
 * A single quality issue detected in a task spec artifact.
 */
export interface SpecQualityIssue {
  /**
   * Machine-readable issue code for reporting.
   */
  code: 'UNRESOLVED_PLACEHOLDER' | 'INTERVIEW_INCOMPLETE' | 'MISSING_SPEC_BODY';
  /**
   * Human-readable description of the quality failure.
   */
  message: string;
}

/**
 * Result of evaluating spec.md quality after specify or clarify.
 */
export interface SpecQualityReport {
  /**
   * True when no quality issues were detected.
   */
  passed: boolean;
  /**
   * Ordered list of detected quality issues (empty when passed).
   */
  issues: SpecQualityIssue[];
}

/**
 * Evaluates spec.md prose and optional interview session completeness.
 *
 * @param specBody - Markdown body of spec.md excluding frontmatter.
 * @param interviewSession - Optional interview session to validate critical questions.
 * @returns Quality report with pass/fail and issue details.
 */
export function checkSpecContentQuality(
  specBody: string,
  interviewSession?: InterviewSession,
): SpecQualityReport {
  const issues: SpecQualityIssue[] = [];

  if (specBody.trim().length === 0) {
    issues.push({
      code: 'MISSING_SPEC_BODY',
      message: 'spec.md body is empty after the specify interview.',
    });
  }

  if (PLACEHOLDER_PATTERN.test(specBody)) {
    issues.push({
      code: 'UNRESOLVED_PLACEHOLDER',
      message: 'spec.md still contains unresolved <!-- FILL: placeholder markers.',
    });
  }

  if (interviewSession != null && !isInterviewComplete(interviewSession)) {
    issues.push({
      code: 'INTERVIEW_INCOMPLETE',
      message: 'Critical interview questions remain unresolved.',
    });
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Reads spec.md from disk and runs the built-in quality checklist.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param interviewSession - Optional interview session used for completeness checks.
 * @returns Quality report for the on-disk spec.md artifact.
 */
export async function checkSpecQuality(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  interviewSession?: InterviewSession,
): Promise<SpecQualityReport> {
  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  if (!(await fse.pathExists(filePath))) {
    return {
      passed: false,
      issues: [
        {
          code: 'MISSING_SPEC_BODY',
          message: 'spec.md does not exist for this task spec.',
        },
      ],
    };
  }

  const content = await fse.readFile(filePath, 'utf8');
  const { body } = parseFrontmatterDocument(content);
  return checkSpecContentQuality(body, interviewSession);
}
