import path from 'node:path';
import fse from 'fs-extra';

import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../init.js';
import { workflowConfigSchema, type SpecifyStageInjection } from '../config/schema.js';
import { parseFrontmatterDocument, serializeFrontmatterDocument } from '../core/frontmatter.js';
import { allocateNextTaskSpecId } from '../core/project-metadata.js';
import { writeTaskMetadata } from '../core/task-metadata.js';
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
import { runTriageWithExtensions } from '../extensions/hooks.js';
import { listSetLists } from '../setlists/index.js';
import { type TriageAssessment } from './triage.js';

const SLUG_MAX_LENGTH = 48;

/**
 * Standard feature spec headings that repository injection must preserve.
 */
export const STANDARD_SPEC_HEADINGS = [
  'Feature Specification',
  'User Scenarios',
  'Requirements',
  'Success Criteria',
  'Assumptions',
] as const;

/**
 * Repository workflow sections appended after the standard feature spec body.
 */
export const REPOSITORY_INJECTION_SECTION_HEADINGS = [
  'Repository Discovery Evidence',
  'Proposed Living Spec Changes',
  'Test Coverage Mapping',
  'Unresolved Ambiguity',
  'Assumptions and Limitations',
] as const;

/**
 * Describes downstream intent phrasing for proposed living-spec change types.
 *
 * @param changeType - Proposed living-spec change type from repository workflow injection.
 * @returns Maintainer-facing downstream intent suffix for the rendered proposal.
 */
function formatProposedChangeDownstreamIntent(changeType: string): string {
  if (changeType === 'delete' || changeType === 'merge') {
    return ' (downstream intent — apply deletion or merge during implementation after plan, tasks, and implement)';
  }

  return ' (future downstream change)';
}

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
   * Optional explicit set list id override skipping triage confirmation.
   */
  setListOverride?: string;
  /**
   * Confirms or overrides triage; returns the selected set list id.
   */
  confirmTriage?: (assessment: TriageAssessment) => Promise<string>;
  /**
   * Supplies an answer for each interview question (one at a time).
   */
  answerInterview?: (question: InterviewQuestion) => Promise<string>;
  /**
   * Optional codebase explorer used before asking each interview question.
   */
  exploreCodebase?: CodebaseExplorer;
  /**
   * Optional repository workflow injection context for specify-stage output.
   */
  specifyInjection?: SpecifyStageInjection;
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
   * Confirmed workflow id from the selected set list for subsequent steps.
   */
  workflowVariantId: string;
  /**
   * Selected set list id from triage.
   */
  setListId: string;
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
  specifyInjection?: SpecifyStageInjection,
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

  const standardBody = `# Feature Specification

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

  const injectionBody =
    specifyInjection != null ? `\n${renderSpecifyInjectionSections(specifyInjection)}` : '';
  const body = `${standardBody}${injectionBody}`;

  await fse.writeFile(
    filePath,
    serializeFrontmatterDocument({ frontmatter: document.frontmatter, body }),
    'utf8',
  );
}

/**
 * Renders repository workflow injection sections for inclusion in spec.md.
 *
 * @param injection - Repository workflow specify-stage injection payload.
 * @returns Markdown sections appended after the standard feature spec body.
 */
export function renderSpecifyInjectionSections(injection: SpecifyStageInjection): string {
  const evidenceLines =
    injection.evidenceSummary.length > 0
      ? injection.evidenceSummary
          .map(
            (record) =>
              `- **${record.id}** (${record.evidenceKind}, ${record.confidence}): ${record.behaviorSummary} — ${record.sourceRef}`,
          )
          .join('\n')
      : '- No repository evidence was collected for this run.';

  const proposedChanges =
    injection.proposedLivingSpecChanges.length > 0
      ? injection.proposedLivingSpecChanges
          .map(
            (change) =>
              `- **${change.changeType}** \`${change.targetRef}\`: ${change.reason}${formatProposedChangeDownstreamIntent(change.changeType)}`,
          )
          .join('\n')
      : '- No living-spec changes proposed.';

  const coverageLines =
    injection.testCoverageMappings.length > 0
      ? injection.testCoverageMappings
          .map((mapping) => {
            const testList =
              mapping.testRefs.length > 0
                ? mapping.testRefs.map((ref) => `\`${ref}\``).join(', ')
                : 'none';
            const validationTarget =
              mapping.recommendedValidationTarget != null
                ? ` Recommended validation target: ${mapping.recommendedValidationTarget}`
                : '';
            const notes = mapping.notes != null ? ` ${mapping.notes}` : '';

            return `- **${mapping.behaviorId}** (${mapping.coverageType}): supporting tests ${testList}.${validationTarget}${notes}`;
          })
          .join('\n')
      : '- Existing tests cover the discovered in-scope behavior or no gaps were identified.';

  const gapLines =
    injection.testGapRecommendations.length > 0
      ? injection.testGapRecommendations
          .map(
            (gap) =>
              `- **${gap.behaviorId}**: ${gap.recommendedValidationTarget} (recommended validation target)`,
          )
          .join('\n')
      : '';

  const ambiguityLines =
    injection.questions.length > 0
      ? injection.questions
          .map((question) => `- **${question.id}**: ${question.prompt}`)
          .join('\n')
      : '- No unresolved ambiguity requires maintainer authority during this run.';

  const assumptionLines =
    injection.assumptions.length > 0
      ? injection.assumptions.map((assumption) => `- ${assumption}`).join('\n')
      : '- No additional assumptions recorded.';

  const instructionLines = injection.instructions.map((instruction) => `- ${instruction}`).join('\n');

  const driftLines =
    injection.driftFindings.length > 0
      ? injection.driftFindings
          .map((finding) => {
            const downstreamIntent =
              finding.recommendedChange === 'delete' || finding.recommendedChange === 'merge'
                ? ' — downstream intent only; apply during implementation'
                : '';
            return `- **${finding.id}** (${finding.category}, ${finding.recommendedChange}): ${finding.summary} — \`${finding.livingSpecRef}\`${downstreamIntent}`;
          })
          .join('\n')
      : '';

  return `## Repository Discovery Evidence

${evidenceLines}
${driftLines.length > 0 ? `\n## Drift Findings\n\n${driftLines}\n` : ''}
## Proposed Living Spec Changes

${proposedChanges}

## Test Coverage Mapping

${coverageLines}
${gapLines.length > 0 ? `\n### Recommended Validation Targets\n\n${gapLines}` : ''}

## Unresolved Ambiguity

${ambiguityLines}

## Assumptions and Limitations

${assumptionLines}

### Specify Injection Instructions

${instructionLines}
`;
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

  const enabledSetLists = await listSetLists(projectRoot, false);
  const triageAssessment = await runTriageWithExtensions({
    projectRoot,
    description: options.description,
    defaultWorkflowId: workflowConfig.defaultWorkflowId,
    availableWorkflowIds: workflowConfig.workflows.map((workflow) => workflow.id),
    enabledSetLists,
  });

  if (triageAssessment.blocking === true) {
    throw new Error(
      triageAssessment.message ??
        'Specify cannot proceed because no enabled set lists remain for triage.',
    );
  }

  const resolveWorkflowId = (setListId: string): string => {
    const selected = enabledSetLists.find((setList) => setList.id === setListId);
    if (selected == null) {
      throw new Error(`Set list "${setListId}" was not found or is disabled.`);
    }
    return selected.workflowId;
  };

  let setListId: string;
  if (options.setListOverride != null) {
    setListId = options.setListOverride;
  } else if (options.confirmTriage != null) {
    setListId = await options.confirmTriage(triageAssessment);
  } else {
    setListId = triageAssessment.proposedSetListId ?? triageAssessment.defaultSetListId;
  }

  const workflowVariantId = resolveWorkflowId(setListId);

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
  await writeTaskMetadata(projectRoot, taskSpecId, slug, {
    createdAt: new Date().toISOString(),
  });
  await setTaskSpecStatus(projectRoot, taskSpecId, slug, 'Active');

  const interviewSession = createInterviewSession({
    sessionType: 'specify',
    taskSpecId,
    slug,
    description: options.description,
    injectedQuestions: options.specifyInjection?.questions,
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
    options.specifyInjection,
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
    setListId,
    triageAssessment,
    interviewSession,
    qualityPassed: qualityReport.passed,
  };
}
