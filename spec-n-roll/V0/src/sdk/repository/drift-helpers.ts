import {
  driftFindingSchema,
  type DriftCategory,
  type DriftFinding,
  type DriftRecommendedChange,
} from '../config/schema.js';

export type {
  DriftAuthorityChoice,
  DriftCategory,
  DriftFinding,
  DriftRecommendedChange,
} from '../config/schema.js';

/**
 * Supported drift finding categories.
 */
export const DRIFT_CATEGORIES = [
  'behavior',
  'documentation',
  'test',
  'organization',
] as const satisfies readonly DriftCategory[];

/**
 * Supported downstream resolution intents for drift findings.
 */
export const DRIFT_RECOMMENDED_CHANGES = [
  'update',
  'delete',
  'merge',
  'refresh-wording',
  'add-test',
  'none',
] as const satisfies readonly DriftRecommendedChange[];

/**
 * Maintainer-facing descriptions for drift categories.
 */
export const DRIFT_CATEGORY_DESCRIPTIONS: Readonly<Record<DriftCategory, string>> = {
  behavior: 'Existing living spec no longer matches observed product behavior.',
  documentation: 'Documentation or wording is stale while behavior remains unchanged.',
  test: 'Tests are missing, stale, indirect, or contradict behavior or specs.',
  organization: 'Spec grouping, naming, merge, or deletion should change without behavior change.',
};

/**
 * Returns true when a value is a supported drift category.
 *
 * @param value - Candidate drift category string.
 * @returns True when the value is a supported drift category.
 */
export function isDriftCategory(value: string): value is DriftCategory {
  return (DRIFT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Returns the maintainer-facing description for a drift category.
 *
 * @param category - Drift category to describe.
 * @returns Short description of the drift category meaning.
 */
export function describeDriftCategory(category: DriftCategory): string {
  return DRIFT_CATEGORY_DESCRIPTIONS[category];
}

/**
 * Creates a validated drift finding record.
 *
 * @param input - Drift finding fields to validate.
 * @returns Parsed drift finding.
 */
export function createDriftFinding(input: DriftFinding): DriftFinding {
  return driftFindingSchema.parse(input);
}

/**
 * Groups drift findings by category for report and specify injection summaries.
 *
 * @param findings - Drift findings gathered for a repository workflow run.
 * @returns Map keyed by drift category with matching findings.
 */
export function groupDriftFindingsByCategory(
  findings: readonly DriftFinding[],
): Map<DriftCategory, DriftFinding[]> {
  const grouped = new Map<DriftCategory, DriftFinding[]>();

  for (const category of DRIFT_CATEGORIES) {
    grouped.set(category, []);
  }

  for (const finding of findings) {
    grouped.get(finding.category)?.push(finding);
  }

  return grouped;
}
