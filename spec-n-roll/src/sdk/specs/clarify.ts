import path from 'node:path';
import fse from 'fs-extra';

import { parseFrontmatterDocument, serializeFrontmatterDocument } from '../core/frontmatter.js';
import { taskSpecFilePath } from '../core/paths.js';
import {
  assertTaskSpecWritable,
  readTaskSpecStatus,
  setTaskSpecStatus,
} from '../core/task-lifecycle.js';
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

/**
 * Options controlling the /spec-n-clarify follow-up interview flow.
 */
export interface ClarifyOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Zero-padded numeric task spec id to clarify.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Follow-up clarification topic or question from the developer.
   */
  clarificationTopic: string;
  /**
   * When true, appended requirements revert Complete specs to Active.
   */
  addsUnimplementedRequirements?: boolean;
  /**
   * Supplies an answer for each clarify interview question.
   */
  answerInterview?: (question: InterviewQuestion) => Promise<string>;
  /**
   * Optional codebase explorer used before asking each interview question.
   */
  exploreCodebase?: CodebaseExplorer;
}

/**
 * Summary returned after a successful clarify step run.
 */
export interface ClarifyResult {
  /**
   * Task spec id that was clarified.
   */
  taskSpecId: string;
  /**
   * Slug of the clarified task spec.
   */
  slug: string;
  /**
   * True when lifecycle status reverted from Complete to Active.
   */
  revertedToActive: boolean;
  /**
   * Completed clarify interview session.
   */
  interviewSession: InterviewSession;
  /**
   * True when spec quality checks passed after updates.
   */
  qualityPassed: boolean;
}

/**
 * Appends clarify interview answers to the Requirements section of spec.md.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param topic - Clarification topic from the developer.
 * @param session - Completed clarify interview session.
 */
async function appendClarifyToSpec(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  topic: string,
  session: InterviewSession,
): Promise<void> {
  await assertTaskSpecWritable(projectRoot, taskSpecId, slug);

  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  const content = await fse.readFile(filePath, 'utf8');
  const document = parseFrontmatterDocument(content);

  const gap = session.resolvedQuestions['clarify-gap'] ?? topic;
  const impact =
    session.resolvedQuestions['clarify-impact'] ??
    'Adds new un-implemented requirements for a follow-up iteration';

  const addition = `

## Clarifications

### ${topic.trim()}

- **Clarified area**: ${gap}
- **Impact**: ${impact}
`;

  const body = document.body.trimEnd() + addition;
  await fse.writeFile(
    filePath,
    serializeFrontmatterDocument({ frontmatter: document.frontmatter, body: `${body}\n` }),
    'utf8',
  );
}

/**
 * Runs the clarify step follow-up interview for an existing task spec.
 *
 * @param options - Clarify orchestration options and interactive callbacks.
 * @returns Summary of clarify changes including lifecycle transitions.
 */
export async function runClarify(options: ClarifyOptions): Promise<ClarifyResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const addsRequirements = options.addsUnimplementedRequirements ?? true;

  const previousStatus = await readTaskSpecStatus(projectRoot, options.taskSpecId, options.slug);
  let revertedToActive = false;

  if (addsRequirements && previousStatus === 'Complete') {
    await setTaskSpecStatus(projectRoot, options.taskSpecId, options.slug, 'Active');
    revertedToActive = true;
  }

  const interviewSession = createInterviewSession({
    sessionType: 'clarify',
    taskSpecId: options.taskSpecId,
    slug: options.slug,
    description: options.clarificationTopic,
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
      'Clarify interview is incomplete. Provide answerInterview callback or complete the session interactively.',
    );
  }

  await appendClarifyToSpec(
    projectRoot,
    options.taskSpecId,
    options.slug,
    options.clarificationTopic,
    interviewSession,
  );

  const qualityReport = await checkSpecQuality(
    projectRoot,
    options.taskSpecId,
    options.slug,
    interviewSession,
  );

  return {
    taskSpecId: options.taskSpecId,
    slug: options.slug,
    revertedToActive,
    interviewSession,
    qualityPassed: qualityReport.passed,
  };
}
