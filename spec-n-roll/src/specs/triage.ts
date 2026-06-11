/**
 * Default workflow tier variant identifiers used by built-in triage.
 */
export type WorkflowTierId = 'papercut' | 'quick' | 'full';

const WORKFLOW_TIER_IDS: readonly WorkflowTierId[] = ['papercut', 'quick', 'full'];

/**
 * Input for evaluating workflow tier triage from a feature description.
 */
export interface TriageInput {
  /**
   * Natural-language feature description supplied by the developer.
   */
  description: string;
  /**
   * Tier id pre-selected for manual picker when automatic triage is skipped.
   */
  defaultWorkflowId: string;
  /**
   * Workflow tier ids available in the project configuration.
   */
  availableWorkflowIds: readonly string[];
}

/**
 * Result of built-in triage embedded at the start of the specify step.
 */
export interface TriageAssessment {
  /**
   * Whether triage used heuristics or requires manual tier selection.
   */
  mode: 'heuristic' | 'manual';
  /**
   * Heuristic match when mode is `heuristic`; null when manual selection is required.
   */
  proposedWorkflowVariantId: WorkflowTierId | null;
  /**
   * Plain-language explanation of the triage decision for developer confirmation.
   */
  rationale: string;
  /**
   * Tier ids presented when the developer must pick manually.
   */
  availableWorkflowVariantIds: WorkflowTierId[];
  /**
   * Pre-selected tier id in the manual picker (from `defaultWorkflowId`).
   */
  defaultWorkflowVariantId: WorkflowTierId;
}

const PAPERCUT_PATTERNS = [
  /\btypo\b/i,
  /\bcopy\b/i,
  /\blabel\b/i,
  /\btext\b/i,
  /\bsingle[\s-]?file\b/i,
  /\bone[\s-]?line\b/i,
  /\bfix\b/i,
  /\bbug\b/i,
  /\bpatch\b/i,
  /\brename\b/i,
  /\bspelling\b/i,
  /\bui copy\b/i,
];

const FULL_PATTERNS = [
  /\bcross[\s-]?cutting\b/i,
  /\bsubsystem\b/i,
  /\barchitect/i,
  /\bmulti[\s-]?actor\b/i,
  /\bplatform[\s-]?wide\b/i,
  /\bacross\b.+\b(subsystem|service|platform|stack)\b/i,
  /\bnew service\b/i,
  /\bredesign\b/i,
  /\bmigrat(e|ion)\b/i,
  /\benterprise\b/i,
];

const QUICK_PATTERNS = [
  /\badd\b/i,
  /\bnew\b/i,
  /\bimplement\b/i,
  /\bcreate\b/i,
  /\bfeature\b/i,
  /\bendpoint\b/i,
  /\bnotification\b/i,
  /\bsupport\b/i,
  /\benhance\b/i,
  /\bupdate\b.+\b(behavior|flow|logic)\b/i,
];

/**
 * Normalizes configured workflow ids to known built-in tier ids.
 *
 * @param availableWorkflowIds - Workflow ids from project configuration.
 * @returns Ordered list of recognized tier ids for triage output.
 */
function normalizeAvailableTiers(availableWorkflowIds: readonly string[]): WorkflowTierId[] {
  const recognized = availableWorkflowIds.filter((id): id is WorkflowTierId =>
    WORKFLOW_TIER_IDS.includes(id as WorkflowTierId),
  );
  return recognized.length > 0 ? recognized : [...WORKFLOW_TIER_IDS];
}

/**
 * Coerces a workflow id string to a built-in tier id with quick as fallback.
 *
 * @param workflowId - Workflow id from configuration or developer override.
 * @returns A valid built-in tier id.
 */
function coerceWorkflowTierId(workflowId: string): WorkflowTierId {
  if (WORKFLOW_TIER_IDS.includes(workflowId as WorkflowTierId)) {
    return workflowId as WorkflowTierId;
  }
  return 'quick';
}

/**
 * Returns true when the description is too short or vague for heuristic triage.
 *
 * @param description - Trimmed feature description text.
 * @returns True when manual tier selection should be required.
 */
function isAmbiguousDescription(description: string): boolean {
  if (description.length === 0) {
    return true;
  }

  const words = description.split(/\s+/).filter((word) => word.length > 0);
  if (words.length <= 1 && description.length < 12) {
    return true;
  }

  const hasSignal =
    PAPERCUT_PATTERNS.some((pattern) => pattern.test(description)) ||
    QUICK_PATTERNS.some((pattern) => pattern.test(description)) ||
    FULL_PATTERNS.some((pattern) => pattern.test(description));

  return !hasSignal && description.length < 24;
}

/**
 * Scores a description against papercut, quick, and full heuristic patterns.
 *
 * @param description - Trimmed feature description text.
 * @returns Matched tier id and supporting rationale fragment.
 */
function scoreHeuristicTier(description: string): {
  tier: WorkflowTierId;
  rationale: string;
} {
  const papercutHits = PAPERCUT_PATTERNS.filter((pattern) => pattern.test(description)).length;
  const fullHits = FULL_PATTERNS.filter((pattern) => pattern.test(description)).length;
  const quickHits = QUICK_PATTERNS.filter((pattern) => pattern.test(description)).length;

  if (fullHits > 0 && fullHits >= papercutHits) {
    return {
      tier: 'full',
      rationale:
        'Cross-cutting or architectural signals (subsystem, multi-actor, or platform-wide scope) match the full tier.',
    };
  }

  if (papercutHits > 0 && papercutHits >= quickHits) {
    return {
      tier: 'papercut',
      rationale:
        'Single-file fix, copy, or trivial change signals match the papercut tier (specify → implement).',
    };
  }

  if (quickHits > 0) {
    return {
      tier: 'quick',
      rationale:
        'New behavior without architectural overhaul matches the quick tier (specify → tasks → implement).',
    };
  }

  return {
    tier: 'quick',
    rationale:
      'Defaulting to quick tier for a scoped feature addition without strong papercut or full signals.',
  };
}

/**
 * Evaluates built-in triage heuristics for a feature description.
 *
 * @param input - Feature description and workflow configuration context.
 * @returns Triage assessment with proposed tier or manual picker requirements.
 */
export function assessTriage(input: TriageInput): TriageAssessment {
  const description = input.description.trim();
  const availableWorkflowVariantIds = normalizeAvailableTiers(input.availableWorkflowIds);
  const defaultWorkflowVariantId = coerceWorkflowTierId(input.defaultWorkflowId);

  if (isAmbiguousDescription(description)) {
    return {
      mode: 'manual',
      proposedWorkflowVariantId: null,
      rationale:
        'The feature description is empty or too ambiguous for automatic triage. Pick a workflow tier manually.',
      availableWorkflowVariantIds,
      defaultWorkflowVariantId,
    };
  }

  const { tier, rationale } = scoreHeuristicTier(description);

  return {
    mode: 'heuristic',
    proposedWorkflowVariantId: availableWorkflowVariantIds.includes(tier)
      ? tier
      : defaultWorkflowVariantId,
    rationale,
    availableWorkflowVariantIds,
    defaultWorkflowVariantId,
  };
}
