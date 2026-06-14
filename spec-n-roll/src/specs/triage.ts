import type { SetList } from '../setlists/schema.js';
import { evaluateSetListTriage } from '../setlists/triage.js';

/**
 * Summary of one set list returned during triage for agent selection.
 */
export interface TriageSetListSummary {
  /**
   * Stable kebab-case set list id.
   */
  id: string;
  /**
   * Human-readable set list label.
   */
  name: string;
  /**
   * Triage description shown to agents during selection.
   */
  description: string;
  /**
   * Priority used for deterministic tie-breaking.
   */
  priority: number;
  /**
   * Referenced workflow id stored in workflow state when selected.
   */
  workflowId: string;
}

/**
 * Input for evaluating set list triage from a feature description.
 */
export interface TriageInput {
  /**
   * Natural-language feature description supplied by the developer.
   */
  description: string;
  /**
   * Workflow id pre-selected when automatic triage is skipped.
   */
  defaultWorkflowId: string;
  /**
   * Workflow ids available in the project configuration.
   */
  availableWorkflowIds: readonly string[];
  /**
   * Enabled set lists used for config-driven triage evaluation.
   */
  enabledSetLists: readonly SetList[];
}

/**
 * Result of built-in triage embedded at the start of the specify step.
 */
export interface TriageAssessment {
  /**
   * Whether triage used heuristics, requires manual selection, or is blocked.
   */
  mode: 'heuristic' | 'manual' | 'blocking';
  /**
   * Heuristic set list match when mode is `heuristic`; null when manual selection is required.
   */
  proposedSetListId: string | null;
  /**
   * Workflow id derived from the proposed set list for workflow state persistence.
   */
  proposedWorkflowId: string | null;
  /**
   * Plain-language explanation of the triage decision for developer confirmation.
   */
  rationale: string;
  /**
   * Enabled set lists presented during triage.
   */
  eligibleSetLists: readonly TriageSetListSummary[];
  /**
   * Pre-selected set list id in the manual picker.
   */
  defaultSetListId: string;
  /**
   * Workflow id associated with the default set list.
   */
  defaultWorkflowId: string;
  /**
   * Whether multiple set lists tied and priority was used to break the tie.
   */
  ambiguous: boolean;
  /**
   * When true, triage cannot proceed because no enabled set lists remain.
   */
  blocking?: boolean;
  /**
   * Actionable message when `blocking` is true.
   */
  message?: string;
}

/**
 * Maps set list entries to triage summaries for agent-facing output.
 *
 * @param setLists - Enabled set list entries under consideration.
 * @returns Summaries with ids, descriptions, and workflow references.
 */
function toTriageSummaries(setLists: readonly SetList[]): TriageSetListSummary[] {
  return setLists.map((setList) => ({
    id: setList.id,
    name: setList.name,
    description: setList.description,
    priority: setList.priority,
    workflowId: setList.workflowId,
  }));
}

/**
 * Resolves the default set list from enabled entries and configured workflow defaults.
 *
 * @param enabledSetLists - Enabled set lists eligible for triage.
 * @param defaultWorkflowId - Workflow id from project configuration.
 * @returns Default set list used when manual selection is required.
 */
function resolveDefaultSetList(
  enabledSetLists: readonly SetList[],
  defaultWorkflowId: string,
): SetList {
  const workflowMatch = enabledSetLists.find((setList) => setList.workflowId === defaultWorkflowId);
  if (workflowMatch != null) {
    return workflowMatch;
  }

  return enabledSetLists.reduce((lowest, current) =>
    current.priority < lowest.priority ? current : lowest,
  );
}

/**
 * Returns true when the description is too short or vague for heuristic triage.
 *
 * @param description - Trimmed feature description text.
 * @returns True when manual set list selection should be required.
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
    TRIVIAL_INTENT_PATTERNS.some((pattern) => pattern.test(description)) ||
    FEATURE_INTENT_PATTERNS.some((pattern) => pattern.test(description)) ||
    ARCHITECTURAL_INTENT_PATTERNS.some((pattern) => pattern.test(description));

  return !hasSignal && description.length < 24;
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

/**
 * Builds a rationale string from the selected set list and triage outcome.
 *
 * @param selected - Set list chosen by triage evaluation.
 * @param selectionReason - Machine-readable selection reason from set-list triage.
 * @param ambiguous - Whether multiple candidates tied before priority tie-break.
 * @returns Plain-language rationale for developer confirmation.
 */
function buildSelectionRationale(
  selected: SetList,
  selectionReason: string,
  ambiguous: boolean,
): string {
  if (selectionReason === 'description-match') {
    return `User intent matches the "${selected.name}" set list description: ${selected.description}`;
  }

  if (ambiguous) {
    return `Multiple set lists could apply. Selected "${selected.name}" by lowest priority (${selected.priority}).`;
  }

  return `Selected "${selected.name}" set list (${selected.description}).`;
}

/**
 * Evaluates config-driven set list triage for a feature description.
 *
 * @param input - Feature description, enabled set lists, and workflow configuration context.
 * @returns Triage assessment with proposed set list or manual picker requirements.
 */
export function assessTriage(input: TriageInput): TriageAssessment {
  const description = input.description.trim();
  const enabledSetLists = input.enabledSetLists.filter((setList) => setList.enabled);

  const triageResult = evaluateSetListTriage({
    userIntent: description,
    eligibleSetLists: enabledSetLists,
  });

  if (triageResult.blocking) {
    return {
      mode: 'blocking',
      proposedSetListId: null,
      proposedWorkflowId: null,
      rationale: triageResult.message ?? 'Triage is blocked because no enabled set lists remain.',
      eligibleSetLists: [],
      defaultSetListId: '',
      defaultWorkflowId: input.defaultWorkflowId,
      ambiguous: false,
      blocking: true,
      message: triageResult.message,
    };
  }

  const defaultSetList = resolveDefaultSetList(enabledSetLists, input.defaultWorkflowId);
  const summaries = toTriageSummaries(enabledSetLists);

  if (isAmbiguousDescription(description)) {
    return {
      mode: 'manual',
      proposedSetListId: null,
      proposedWorkflowId: null,
      rationale:
        'The feature description is empty or too ambiguous for automatic set list triage. Pick a set list manually.',
      eligibleSetLists: summaries,
      defaultSetListId: defaultSetList.id,
      defaultWorkflowId: defaultSetList.workflowId,
      ambiguous: true,
    };
  }

  const selected =
    enabledSetLists.find((setList) => setList.id === triageResult.selectedId) ?? defaultSetList;

  return {
    mode: 'heuristic',
    proposedSetListId: selected.id,
    proposedWorkflowId: selected.workflowId,
    rationale: buildSelectionRationale(selected, triageResult.selectionReason, triageResult.ambiguous),
    eligibleSetLists: summaries,
    defaultSetListId: defaultSetList.id,
    defaultWorkflowId: defaultSetList.workflowId,
    ambiguous: triageResult.ambiguous,
  };
}
