/**
 * Identifies a ranked ambiguity topic explored during specify or clarify interviews.
 */
export interface AmbiguityTopic {
  /**
   * Stable identifier for the ambiguity topic within a session.
   */
  id: string;
  /**
   * Human-readable question prompt presented to the developer.
   */
  prompt: string;
  /**
   * Suggested answer the agent recommends when the developer needs a default.
   */
  recommendedAnswer: string;
  /**
   * Priority rank where lower numbers are asked first.
   */
  rank: number;
}

/**
 * A single interview question ready to present to the developer.
 */
export interface InterviewQuestion {
  /**
   * Stable identifier matching the underlying ambiguity topic.
   */
  id: string;
  /**
   * Targeted question text asking about one unresolved aspect.
   */
  prompt: string;
  /**
   * Suggested answer when the developer accepts the recommendation.
   */
  recommendedAnswer: string;
  /**
   * Brief note explaining why this question matters.
   */
  rationale: string;
}

/**
 * Optional adapter for resolving interview questions from repository context.
 */
export interface CodebaseExplorer {
  /**
   * Attempts to answer a question from codebase inspection before asking the developer.
   *
   * @param questionId - Ambiguity topic identifier.
   * @param prompt - Question text shown to the developer when exploration fails.
   * @returns Resolved answer text or null when exploration cannot answer.
   */
  tryAnswerQuestion(questionId: string, prompt: string): Promise<string | null>;
}

/**
 * Persisted state for a one-question-at-a-time specify or clarify interview.
 */
export interface InterviewSession {
  /**
   * Whether this session creates a new spec or clarifies an existing one.
   */
  sessionType: 'specify' | 'clarify';
  /**
   * Owning task spec numeric id.
   */
  taskSpecId: string;
  /**
   * Owning task spec slug.
   */
  slug: string;
  /**
   * Feature description or clarify topic driving the session.
   */
  description: string;
  /**
   * Recorded question id to answer text for resolved topics.
   */
  resolvedQuestions: Record<string, string>;
  /**
   * Ordered ambiguity topic ids still pending resolution.
   */
  pendingAmbiguityIds: string[];
  /**
   * Full ambiguity catalog for the session keyed by topic id.
   */
  topics: Record<string, AmbiguityTopic>;
}

/**
 * Input for constructing a new interview session.
 */
export interface CreateInterviewSessionInput {
  /**
   * Interview mode: initial specify or follow-up clarify.
   */
  sessionType: 'specify' | 'clarify';
  /**
   * Owning task spec numeric id.
   */
  taskSpecId: string;
  /**
   * Owning task spec slug.
   */
  slug: string;
  /**
   * Feature description or clarify prompt text.
   */
  description: string;
  /**
   * Optional extra ambiguity topics for clarify sessions.
   */
  additionalTopics?: AmbiguityTopic[];
  /**
   * Optional repository workflow questions converted into interview topics.
   */
  injectedQuestions?: Array<{ id: string; prompt: string }>;
}

const SPECIFY_TOPICS: AmbiguityTopic[] = [
  {
    id: 'primary-user',
    prompt: 'Who is the primary user or actor for this feature?',
    recommendedAnswer: 'An authenticated end user of the application',
    rank: 1,
  },
  {
    id: 'core-outcome',
    prompt: 'What is the single most important outcome this feature must deliver?',
    recommendedAnswer: 'A clear, testable behavior change visible to the primary user',
    rank: 2,
  },
  {
    id: 'scope-boundary',
    prompt: 'What should explicitly be out of scope for this first iteration?',
    recommendedAnswer: 'Administrative tooling, billing changes, and unrelated refactors',
    rank: 3,
  },
  {
    id: 'success-signal',
    prompt: 'How will we know this feature is successfully done?',
    recommendedAnswer: 'Measurable acceptance criteria and passing behavior-focused tests',
    rank: 4,
  },
];

const CLARIFY_TOPICS: AmbiguityTopic[] = [
  {
    id: 'clarify-gap',
    prompt: 'Which existing requirement or scenario needs clarification or expansion?',
    recommendedAnswer: 'The acceptance criteria for the primary user flow',
    rank: 1,
  },
  {
    id: 'clarify-impact',
    prompt: 'Does this clarification introduce new un-implemented requirements?',
    recommendedAnswer: 'Yes — append new requirements without changing locked decisions',
    rank: 2,
  },
];

/**
 * Builds the default ambiguity catalog for a session type and description.
 *
 * @param sessionType - Specify or clarify interview mode.
 * @param description - Feature description text influencing topic selection.
 * @returns Ranked ambiguity topics for the session.
 */
function buildTopics(sessionType: 'specify' | 'clarify', description: string): AmbiguityTopic[] {
  const base = sessionType === 'clarify' ? [...CLARIFY_TOPICS] : [...SPECIFY_TOPICS];

  if (description.trim().length < 40 && sessionType === 'specify') {
    return base;
  }

  if (sessionType === 'specify') {
    return base.filter((topic) => topic.rank <= 2);
  }

  return base;
}

/**
 * Creates a new interview session with ranked pending ambiguities.
 *
 * @param input - Session identity, description, and optional clarify topics.
 * @returns Initialized interview session state.
 */
export function createInterviewSession(input: CreateInterviewSessionInput): InterviewSession {
  const injectedTopics = createAmbiguityTopicsFromInjectedQuestions(input.injectedQuestions ?? []);
  const catalog = [
    ...buildTopics(input.sessionType, input.description),
    ...(input.additionalTopics ?? []),
    ...injectedTopics,
  ].sort((left, right) => left.rank - right.rank);

  const topics = Object.fromEntries(catalog.map((topic) => [topic.id, topic]));
  const pendingAmbiguityIds = catalog.map((topic) => topic.id);

  return {
    sessionType: input.sessionType,
    taskSpecId: input.taskSpecId,
    slug: input.slug,
    description: input.description,
    resolvedQuestions: {},
    pendingAmbiguityIds,
    topics,
  };
}

/**
 * Returns the next unresolved interview question or null when the session is complete.
 *
 * @param session - Current interview session state.
 * @param explorer - Optional codebase explorer used before asking the developer.
 * @returns Next question or null when all critical topics are resolved.
 */
export async function getNextInterviewQuestion(
  session: InterviewSession,
  explorer?: CodebaseExplorer,
): Promise<InterviewQuestion | null> {
  for (const topicId of session.pendingAmbiguityIds) {
    if (session.resolvedQuestions[topicId] != null) {
      continue;
    }

    const topic = session.topics[topicId];
    if (topic == null) {
      continue;
    }

    if (explorer != null) {
      const explored = await explorer.tryAnswerQuestion(topic.id, topic.prompt);
      if (explored != null && explored.trim().length > 0) {
        session.resolvedQuestions[topic.id] = explored.trim();
        continue;
      }
    }

    return {
      id: topic.id,
      prompt: topic.prompt,
      recommendedAnswer: topic.recommendedAnswer,
      rationale: `Resolving "${topic.id}" reduces ambiguity before completing the ${session.sessionType} session.`,
    };
  }

  return null;
}

/**
 * Records a developer answer and removes the topic from the pending queue.
 *
 * @param session - Interview session to update in place.
 * @param questionId - Ambiguity topic id being resolved.
 * @param answer - Developer-provided or recommended answer text.
 * @returns Updated session reference for chaining.
 */
export function recordInterviewAnswer(
  session: InterviewSession,
  questionId: string,
  answer: string,
): InterviewSession {
  const trimmed = answer.trim();
  if (trimmed.length === 0) {
    return session;
  }

  session.resolvedQuestions[questionId] = trimmed;
  session.pendingAmbiguityIds = session.pendingAmbiguityIds.filter((id) => id !== questionId);
  return session;
}

/**
 * Returns true when all pending ambiguity topics have recorded answers.
 *
 * @param session - Interview session to evaluate.
 * @returns True when no unresolved topics remain.
 */
export function isInterviewComplete(session: InterviewSession): boolean {
  return session.pendingAmbiguityIds.every((id) => session.resolvedQuestions[id] != null);
}

/**
 * Converts repository workflow injection questions into ranked interview topics.
 *
 * @param questions - Repository workflow ambiguity or authority questions.
 * @returns Ambiguity topics appended after standard specify topics.
 */
export function createAmbiguityTopicsFromInjectedQuestions(
  questions: readonly { id: string; prompt: string }[],
): AmbiguityTopic[] {
  return questions.map((question, index) => ({
    id: question.id,
    prompt: question.prompt,
    recommendedAnswer: 'Record the maintainer authority choice during clarify.',
    rank: 100 + index,
  }));
}
