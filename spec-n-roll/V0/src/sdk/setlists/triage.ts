import type { SetList } from './schema.js';

/**
 * Input for evaluating which set list best matches user intent.
 */
export interface SetListTriageInput {
  /**
   * Natural-language description of the work to triage.
   */
  userIntent: string;
  /**
   * Enabled set lists eligible for selection.
   */
  eligibleSetLists: readonly SetList[];
}

/**
 * Result of set list triage evaluation.
 */
export interface SetListTriageResult {
  /**
   * Set lists considered during evaluation, typically all enabled entries.
   */
  eligible: readonly SetList[];
  /**
   * Selected set list id when triage succeeds.
   */
  selectedId: string | null;
  /**
   * Plain-language explanation of how the selection was made.
   */
  selectionReason: string;
  /**
   * Whether multiple entries tied and priority was used to break the tie.
   */
  ambiguous: boolean;
  /**
   * When true, no enabled set lists remain and triage cannot proceed.
   */
  blocking: boolean;
  /**
   * Actionable message when `blocking` is true.
   */
  message?: string;
}

const TRIVIAL_INTENT_PATTERNS = [
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
];

const ARCHITECTURAL_INTENT_PATTERNS = [
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

const FEATURE_INTENT_PATTERNS = [
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

const TRIVIAL_DESCRIPTION_HINTS = /\b(trivial|single[\s-]?file|minimal|ceremony|small change)\b/i;
const ARCHITECTURAL_DESCRIPTION_HINTS =
  /\b(cross[\s-]?cutting|architect|subsystem|platform|full spec|plan)\b/i;
const FEATURE_DESCRIPTION_HINTS = /\b(small feature|specify|tasks|implement|scoped)\b/i;

/**
 * Scores how well a set list description matches the user intent text.
 *
 * @param userIntent - Trimmed natural-language intent.
 * @param setList - Enabled set list entry under evaluation.
 * @returns Non-negative relevance score for ranking candidates.
 */
function scoreSetListMatch(userIntent: string, setList: SetList): number {
  const intent = userIntent.toLowerCase();
  const description = setList.description.toLowerCase();
  const descriptionWords = new Set(description.split(/\W+/).filter((word) => word.length > 3));
  const intentWords = intent.split(/\W+/).filter((word) => word.length > 2);

  let score = 0;
  for (const word of intentWords) {
    if (descriptionWords.has(word)) {
      score += 2;
    }
  }

  const trivialIntent = TRIVIAL_INTENT_PATTERNS.some((pattern) => pattern.test(intent));
  const architecturalIntent = ARCHITECTURAL_INTENT_PATTERNS.some((pattern) => pattern.test(intent));
  const featureIntent = FEATURE_INTENT_PATTERNS.some((pattern) => pattern.test(intent));

  if (trivialIntent && TRIVIAL_DESCRIPTION_HINTS.test(description)) {
    score += 10;
  }
  if (architecturalIntent && ARCHITECTURAL_DESCRIPTION_HINTS.test(description)) {
    score += 10;
  }
  if (featureIntent && FEATURE_DESCRIPTION_HINTS.test(description)) {
    score += 8;
  }

  return score;
}

/**
 * Evaluates user intent against enabled set lists and selects by priority rules.
 *
 * @param input - User intent text and eligible set list entries.
 * @returns Triage outcome including selected id or a blocking error state.
 */
export function evaluateSetListTriage(input: SetListTriageInput): SetListTriageResult {
  const eligible = input.eligibleSetLists.filter((setList) => setList.enabled);

  if (eligible.length === 0) {
    return {
      eligible: [],
      selectedId: null,
      selectionReason: 'no-enabled-set-lists',
      ambiguous: false,
      blocking: true,
      message:
        'No enabled set lists remain. Enable at least one set list in .spec-n-roll/config/set-lists.json before triage.',
    };
  }

  const userIntent = input.userIntent.trim();
  const scored = eligible.map((setList) => ({
    setList,
    score: scoreSetListMatch(userIntent, setList),
  }));
  const maxScore = Math.max(...scored.map((entry) => entry.score));
  const topMatches = scored
    .filter((entry) => entry.score === maxScore && entry.score > 0)
    .map((entry) => entry.setList);

  let candidates: readonly SetList[];
  let ambiguous: boolean;
  let selectionReason: string;

  if (topMatches.length > 1) {
    candidates = topMatches;
    ambiguous = true;
    selectionReason = 'priority-tie-break';
  } else if (topMatches.length === 1) {
    candidates = topMatches;
    ambiguous = false;
    selectionReason = 'description-match';
  } else {
    candidates = eligible;
    ambiguous = true;
    selectionReason = 'priority-tie-break';
  }

  const selected = selectSetListByPriority(candidates);

  return {
    eligible,
    selectedId: selected.id,
    selectionReason,
    ambiguous,
    blocking: false,
  };
}

/**
 * Selects the lowest-priority-number set list from a non-empty eligible list.
 *
 * @param eligibleSetLists - Non-empty list of enabled set lists under consideration.
 * @returns The set list with the smallest `priority` value.
 */
export function selectSetListByPriority(eligibleSetLists: readonly SetList[]): SetList {
  if (eligibleSetLists.length === 0) {
    throw new Error('selectSetListByPriority requires at least one eligible set list');
  }

  return eligibleSetLists.reduce((lowest, current) =>
    current.priority < lowest.priority ? current : lowest,
  );
}
