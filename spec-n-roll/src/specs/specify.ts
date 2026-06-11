import path from 'node:path';
import fse from 'fs-extra';

import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../cli/commands/init.js';
import { workflowConfigSchema } from '../config/schema.js';
import { parseFrontmatterDocument, serializeFrontmatterDocument } from '../core/frontmatter.js';
import { allocateNextTaskSpecId } from '../core/project-metadata.js';
import { taskSpecFilePath } from '../core/paths.js';
import { setTaskSpecStatus } from '../core/task-lifecycle.js';
import { instantiateStepOutput } from '../core/templates.js';
import { writeWorkflowState } from '../core/workflow-state.js';
import {
  createInterviewSession,
  getNextInterviewQuestion,
  isInterviewComplete,
  recordInterviewAnswer,
  type CodebaseExplorer,
  type InterviewQuestion,
  type InterviewSession,
} from './interview.js';
import { checkSpecQuality } from './quality.js';
import { assessTriage, type TriageAssessment, type WorkflowTierId } from './triage.js';

const SLUG_MAX_LENGTH = 48;

/**
 * Options controlling the /spec-n-specify orchestration flow.
 */
export interface SpecifyOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Natural-language feature description from the developer.
   */
  description: string;
  /**
   * Optional developer-provided slug; derived from description when omitted.
   */
  slug?: string;
  /**
   * Optional explicit workflow tier override skipping triage confirmation.
   */
  workflowVariantOverride?: WorkflowTierId;
  /**
   * Confirms or overrides triage; returns the selected workflow variant id.
   */
  confirmTriage?: (assessment: TriageAssessment) => Promise<WorkflowTierId>;
  /**
   * Supplies an answer for each interview question (one at a time).
   */
  answerInterview?: (question: InterviewQuestion) => Promise<string>;
  /**
   * Optional codebase explorer used before asking each interview question.
   */
  exploreCodebase?: CodebaseExplorer;
}

/**
 * Summary returned after a successful specify step run.
 */
export interface SpecifyResult {
  /**
   * Allocated numeric task spec id.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug used in the task spec directory name.
   */
  slug: string;
  /**
   * Confirmed workflow tier variant id for subsequent steps.
   */
  workflowVariantId: WorkflowTierId;
  /**
   * Triage assessment presented before confirmation.
   */
  triageAssessment: TriageAssessment;
  /**
   * Completed interview session with recorded answers.
   */
  interviewSession: InterviewSession;
  /**
   * True when spec quality checks passed after prose updates.
   */
  qualityPassed: boolean;
}

/**
 * Derives a kebab-case slug from a feature description.
 *
 * @param description - Natural-language feature description.
 * @param maxLength - Maximum slug length before truncation.
 * @returns Kebab-case slug suitable for directory naming.
 */
export function deriveSlugFromDescription(description: string, maxLength = SLUG_MAX_LENGTH): string {
  const normalized = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 6)
    .join('-');

  if (normalized.length === 0) {
    return 'feature';
  }

  return normalized.length > maxLength ? normalized.slice(0, maxLength).replace(/-$/, '') : normalized;
}

/**
 * Loads workflow configuration for triage from the project config file.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Parsed workflow configuration.
 */
async function readWorkflowConfig(projectRoot: string) {
  const configPath = path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH);
  const raw: unknown = await fse.readJson(configPath);
  return workflowConfigSchema.parse(raw);
}

/**
 * Applies interview answers to spec.md prose sections after template instantiation.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param description - Original feature description.
 * @param session - Completed interview session with resolved answers.
 */
async function applyInterviewToSpecProse(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  description: string,
  session: InterviewSession,
): Promise<void> {
  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  const content = await fse.readFile(filePath, 'utf8');
  const document = parseFrontmatterDocument(content);

  const summary = description.trim();
  const primaryUser = session.resolvedQuestions['primary-user'] ?? 'End users';
  const coreOutcome =
    session.resolvedQuestions['core-outcome'] ?? 'Deliver the described behavior reliably';
  const scopeBoundary =
    session.resolvedQuestions['scope-boundary'] ?? 'Unrelated systems and refactors';
  const successSignal =
    session.resolvedQuestions['success-signal'] ?? 'Measurable acceptance criteria are met';

  const body = `# Feature Specification

${summary}

## User Scenarios

### Scenario 1 — Primary flow

**Given** ${primaryUser} is using the application, **When** the feature is invoked, **Then** ${coreOutcome}.

## Requirements

- **FR-001**: The system MUST ${coreOutcome.toLowerCase()}.
- **FR-002**: The system MUST keep ${scopeBoundary} out of scope for this iteration.

## Success Criteria

- ${successSignal}

## Assumptions

- ${primaryUser} has access required to use this feature.
- ${scopeBoundary} remain unchanged unless explicitly added later via clarify.
`;

  await fse.writeFile(
    filePath,
    serializeFrontmatterDocument({ frontmatter: document.frontmatter, body }),
    'utf8',
  );
}

/**
 * Runs the full specify step: triage, template instantiation, interview, and state writes.
 *
 * @param options - Specify orchestration options and interactive callbacks.
 * @returns Summary of the created task spec and completed specify step.
 */
export async function runSpecify(options: SpecifyOptions): Promise<SpecifyResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const workflowConfig = await readWorkflowConfig(projectRoot);

  const { taskSpecId } = await allocateNextTaskSpecId(projectRoot);
  const slug = options.slug?.trim() || deriveSlugFromDescription(options.description);

  const triageAssessment = assessTriage({
    description: options.description,
    defaultWorkflowId: workflowConfig.defaultWorkflowId,
    availableWorkflowIds: workflowConfig.workflows.map((workflow) => workflow.id),
  });

  let workflowVariantId: WorkflowTierId;
  if (options.workflowVariantOverride != null) {
    workflowVariantId = options.workflowVariantOverride;
  } else if (options.confirmTriage != null) {
    workflowVariantId = await options.confirmTriage(triageAssessment);
  } else {
    workflowVariantId =
      triageAssessment.proposedWorkflowVariantId ?? triageAssessment.defaultWorkflowVariantId;
  }

  await writeWorkflowState(projectRoot, {
    taskSpecId,
    slug,
    workflowVariantId,
    lastCompletedStepId: null,
    currentStepId: 'specify',
    status: 'active',
  });

  await instantiateStepOutput(projectRoot, taskSpecId, slug, 'specify', {
    frontmatter: { status: 'Active' },
  });
  await setTaskSpecStatus(projectRoot, taskSpecId, slug, 'Active');

  const interviewSession = createInterviewSession({
    sessionType: 'specify',
    taskSpecId,
    slug,
    description: options.description,
  });

  if (options.answerInterview != null) {
    let question = await getNextInterviewQuestion(interviewSession, options.exploreCodebase);
    while (question != null) {
      const answer = await options.answerInterview(question);
      recordInterviewAnswer(interviewSession, question.id, answer);
      question = await getNextInterviewQuestion(interviewSession, options.exploreCodebase);
    }
  }

  if (!isInterviewComplete(interviewSession) && options.answerInterview == null) {
    throw new Error(
      'Specify interview is incomplete. Provide answerInterview callback or complete the session interactively.',
    );
  }

  await applyInterviewToSpecProse(
    projectRoot,
    taskSpecId,
    slug,
    options.description,
    interviewSession,
  );

  const qualityReport = await checkSpecQuality(projectRoot, taskSpecId, slug, interviewSession);

  await writeWorkflowState(projectRoot, {
    taskSpecId,
    slug,
    workflowVariantId,
    lastCompletedStepId: 'specify',
    currentStepId: null,
    status: 'active',
  });

  return {
    taskSpecId,
    slug,
    workflowVariantId,
    triageAssessment,
    interviewSession,
    qualityPassed: qualityReport.passed,
  };
}
