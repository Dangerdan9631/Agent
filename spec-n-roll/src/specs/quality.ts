import path from 'node:path';
import fse from 'fs-extra';

import { parseFrontmatterDocument } from '../core/frontmatter.js';
import { taskSpecDir, taskSpecFilePath } from '../core/paths.js';
import { readWorkflowState } from '../core/workflow-state.js';
import { getVariantStepIds } from '../workflow/step-manifest.js';
import { stepOutputsExist } from '../workflow/artifacts.js';
import type { InterviewSession } from './interview.js';
import { isInterviewComplete } from './interview.js';
import { tasksTemplateSatisfiesFr009 } from './tasks.js';

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

/**
 * Machine-readable issue codes for cross-artifact analysis.
 */
export type AnalyzeIssueCode =
  | 'MISSING_ARTIFACT'
  | 'UNRESOLVED_PLACEHOLDER'
  | 'FR009_TASKS_ORDER'
  | 'MISSING_LIVING_SPEC_TARGETS'
  | 'WORKFLOW_STEP_SKIPPED'
  | 'LIVING_SPEC_GAP';

/**
 * A single cross-artifact analysis finding.
 */
export interface AnalyzeIssue {
  /**
   * Machine-readable issue code.
   */
  code: AnalyzeIssueCode;
  /**
   * Human-readable description of the finding.
   */
  message: string;
  /**
   * Optional project-relative path to the related artifact.
   */
  artifactPath?: string;
}

/**
 * Non-destructive cross-artifact analysis report for `/spec-n-analyze`.
 */
export interface CrossArtifactAnalyzeReport {
  /**
   * True when no analysis issues were detected.
   */
  passed: boolean;
  /**
   * Ordered list of detected issues (empty when passed).
   */
  issues: AnalyzeIssue[];
}

/**
 * Options controlling cross-artifact analysis for a task spec.
 */
export interface RunAnalyzeOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Zero-padded numeric task spec id.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * When true, include living-specs directory checks.
   */
  includeLivingSpecs?: boolean;
}

/**
 * Checks a markdown artifact for unresolved template placeholders.
 *
 * @param content - File content to inspect.
 * @returns True when placeholder markers remain.
 */
function hasUnresolvedPlaceholders(content: string): boolean {
  return PLACEHOLDER_PATTERN.test(content);
}

/**
 * Produces a non-destructive cross-artifact consistency report for a task spec.
 *
 * @param options - Analyze options including optional living-spec checks.
 * @returns Analysis report with gaps, checklist failures, and contradictions.
 */
export async function runCrossArtifactAnalysis(
  options: RunAnalyzeOptions,
): Promise<CrossArtifactAnalyzeReport> {
  const projectRoot = path.resolve(options.projectRoot);
  const { taskSpecId, slug } = options;
  const issues: AnalyzeIssue[] = [];
  const taskDirectory = taskSpecDir(projectRoot, taskSpecId, slug);
  const state = await readWorkflowState(projectRoot, taskSpecId, slug);
  const variantId = state?.workflowVariantId ?? 'quick';
  const tierSteps = getVariantStepIds(variantId);

  const specPath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  if (!(await fse.pathExists(specPath))) {
    issues.push({
      code: 'MISSING_ARTIFACT',
      message: 'spec.md is missing for this task spec.',
      artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'spec.md'),
    });
  } else {
    const specContent = await fse.readFile(specPath, 'utf8');
    const { body } = parseFrontmatterDocument(specContent);
    if (hasUnresolvedPlaceholders(body)) {
      issues.push({
        code: 'UNRESOLVED_PLACEHOLDER',
        message: 'spec.md contains unresolved <!-- FILL: placeholder markers.',
        artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'spec.md'),
      });
    }
  }

  if (tierSteps.includes('plan')) {
    const planPath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'plan.md');
    if (!(await fse.pathExists(planPath))) {
      issues.push({
        code: 'MISSING_ARTIFACT',
        message: 'plan.md is expected for the full tier but is missing.',
        artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'plan.md'),
      });
    } else {
      const planContent = await fse.readFile(planPath, 'utf8');
      if (!planContent.includes('## Living Spec Targets')) {
        issues.push({
          code: 'MISSING_LIVING_SPEC_TARGETS',
          message: 'plan.md is missing the Living Spec Targets section.',
          artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'plan.md'),
        });
      }
      if (hasUnresolvedPlaceholders(planContent)) {
        issues.push({
          code: 'UNRESOLVED_PLACEHOLDER',
          message: 'plan.md contains unresolved <!-- FILL: placeholder markers.',
          artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'plan.md'),
        });
      }
    }
  }

  if (tierSteps.includes('tasks')) {
    const tasksPath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'tasks.md');
    if (!(await fse.pathExists(tasksPath))) {
      issues.push({
        code: 'MISSING_ARTIFACT',
        message: 'tasks.md is expected for this tier but is missing.',
        artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'tasks.md'),
      });
    } else {
      const tasksContent = await fse.readFile(tasksPath, 'utf8');
      if (!tasksTemplateSatisfiesFr009(tasksContent)) {
        issues.push({
          code: 'FR009_TASKS_ORDER',
          message:
            'tasks.md does not list living-spec updates before test/code tasks (FR-009).',
          artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'tasks.md'),
        });
      }
      if (hasUnresolvedPlaceholders(tasksContent)) {
        issues.push({
          code: 'UNRESOLVED_PLACEHOLDER',
          message: 'tasks.md contains unresolved <!-- FILL: placeholder markers.',
          artifactPath: path.posix.join('specs', `${taskSpecId}-${slug}`, 'tasks.md'),
        });
      }
    }
  }

  if (state != null) {
    for (const stepId of tierSteps) {
      if (stepId === 'implement') {
        continue;
      }
      const exists = await stepOutputsExist(projectRoot, taskDirectory, stepId, variantId);
      const lastIndex = tierSteps.indexOf(state.lastCompletedStepId ?? '');
      const stepIndex = tierSteps.indexOf(stepId);
      if (stepIndex >= 0 && lastIndex >= 0 && stepIndex <= lastIndex && !exists) {
        issues.push({
          code: 'WORKFLOW_STEP_SKIPPED',
          message: `Workflow state marks "${stepId}" complete but expected outputs are missing.`,
        });
      }
    }
  }

  if (options.includeLivingSpecs !== false) {
    const livingSpecsDir = path.join(projectRoot, 'living-specs');
    const planPath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'plan.md');
    if (
      (await fse.pathExists(planPath)) &&
      (await fse.pathExists(livingSpecsDir)) &&
      (await fse.readdir(livingSpecsDir)).length === 0
    ) {
      issues.push({
        code: 'LIVING_SPEC_GAP',
        message:
          'plan.md documents living-spec targets but living-specs/ contains no feature files yet.',
        artifactPath: 'living-specs/',
      });
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
