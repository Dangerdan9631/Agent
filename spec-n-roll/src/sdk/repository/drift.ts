import path from 'node:path';

import fse from 'fs-extra';

import {
  type DiscoveryPlan,
  type DriftFinding,
  type DriftRecommendedChange,
  type ProposedLivingSpecChange,
  type RepositoryEvidence,
  type RepositoryInjectionQuestion,
  type TestCoverageMapping,
  type TestGapRecommendation,
} from '../config/schema.js';
import { parseFeatureFile, type GherkinScenario } from '../living-specs/gherkin.js';
import {
  collectOnboardingEvidence,
  createRepositoryEvidence,
  type CollectOnboardingEvidenceResult,
} from './evidence.js';
import { createDriftFinding } from './drift-helpers.js';
import { assertPathsInsideProjectRoot, normalizeProjectRelativePath } from './discovery-plan.js';

export type {
  DriftAuthorityChoice,
  DriftCategory,
  DriftFinding,
  DriftRecommendedChange,
} from '../config/schema.js';

export { createDriftFinding, groupDriftFindingsByCategory } from './drift-helpers.js';
export {
  DRIFT_CATEGORIES,
  DRIFT_CATEGORY_DESCRIPTIONS,
  DRIFT_RECOMMENDED_CHANGES,
  describeDriftCategory,
  isDriftCategory,
} from './drift-helpers.js';

/**
 * One normalized living-spec scenario prepared for drift comparison.
 */
export interface NormalizedLivingSpecScenario {
  /**
   * Project-relative living-spec reference including scenario title.
   */
  livingSpecRef: string;
  /**
   * Project-relative path to the parent feature file.
   */
  featurePath: string;
  /**
   * Scenario title without the Scenario prefix.
   */
  scenarioName: string;
  /**
   * Feature title from the Feature line.
   */
  featureTitle: string;
  /**
   * Tags applied directly above the scenario declaration.
   */
  tags: string[];
  /**
   * Indented Gherkin step lines for the scenario.
   */
  steps: string[];
  /**
   * Quoted observable outcomes extracted from Then steps.
   */
  thenExpectations: string[];
  /**
   * Behavior area slug inferred from the feature file name.
   */
  behaviorArea: string;
}

/**
 * Repository evidence and drift findings gathered for specify injection.
 */
export interface CollectDriftAnalysisResult {
  /**
   * Repository evidence records gathered from code, tests, docs, and living specs.
   */
  evidence: RepositoryEvidence[];
  /**
   * Categorized drift findings for existing living-spec scenarios.
   */
  driftFindings: DriftFinding[];
  /**
   * Proposed living-spec update, delete, or merge recommendations.
   */
  proposedLivingSpecChanges: ProposedLivingSpecChange[];
  /**
   * Direct, indirect, missing, or unknown validation mappings for discovered behavior.
   */
  testCoverageMappings: TestCoverageMapping[];
  /**
   * Validation targets for uncovered behavior.
   */
  testGapRecommendations: TestGapRecommendation[];
  /**
   * Authority or ambiguity questions with no default answer.
   */
  questions: RepositoryInjectionQuestion[];
  /**
   * Assumptions recorded separately from confirmed facts.
   */
  assumptions: string[];
}

/**
 * Comparison inputs for one living-spec scenario during drift analysis.
 */
export interface ScenarioDriftContext {
  /**
   * Return-value template literals or string literals observed in code.
   */
  codeReturnLiterals: readonly string[];
  /**
   * Literal values asserted by executable tests.
   */
  testExpectedValues: readonly string[];
  /**
   * Condensed documentation summary for the behavior area.
   */
  documentationSummary: string;
  /**
   * When true, evaluate documentation drift without behavior comparison.
   */
  documentationOnly?: boolean;
}

const LIVING_SPECS_DIR = 'living-specs';

/**
 * Loads and normalizes Gherkin scenarios from living-spec feature files in scope.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param scopedPaths - Project-relative directories or files to inspect for `.feature` files.
 * @returns Normalized living-spec scenarios in source order.
 */
export async function loadLivingSpecScenarios(
  projectRoot: string,
  scopedPaths: readonly string[],
): Promise<NormalizedLivingSpecScenario[]> {
  const resolvedRoot = path.resolve(projectRoot);
  const normalizedPaths = assertPathsInsideProjectRoot(resolvedRoot, scopedPaths);
  const featureFiles = await listFeatureFiles(resolvedRoot, normalizedPaths);
  const scenarios: NormalizedLivingSpecScenario[] = [];

  for (const featurePath of featureFiles) {
    const absolutePath = path.join(resolvedRoot, featurePath);
    const content = await fse.readFile(absolutePath, 'utf8');
    const parsed = parseFeatureFile(content);
    const behaviorArea = path.basename(featurePath, '.feature');

    for (const scenario of parsed.scenarios) {
      scenarios.push(normalizeScenario(featurePath, behaviorArea, scenario));
    }
  }

  return scenarios;
}

/**
 * Categorizes drift for one living-spec scenario against repository evidence.
 *
 * @param scenario - Normalized living-spec scenario to inspect.
 * @param evidence - Repository evidence records for the behavior area.
 * @param context - Code, test, and documentation comparison inputs.
 * @returns Drift finding or undefined when no drift is detected.
 */
export function categorizeScenarioDrift(
  scenario: NormalizedLivingSpecScenario,
  evidence: readonly RepositoryEvidence[],
  context: ScenarioDriftContext,
): DriftFinding | undefined {
  const evidenceRefs = collectScenarioEvidenceRefs(scenario, evidence);

  if (context.documentationOnly === true) {
    return createDriftFinding({
      id: buildFindingId('documentation', scenario),
      category: 'documentation',
      livingSpecRef: scenario.livingSpecRef,
      evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : ['documentation-only'],
      summary:
        'Documentation wording is stale while executable behavior for this scenario remains stable.',
      recommendedChange: 'refresh-wording',
    });
  }

  const livingExpectations = scenario.thenExpectations;
  const testValues = [...context.testExpectedValues];
  const codePatterns = [...context.codeReturnLiterals];

  if (livingExpectations.length === 0) {
    return undefined;
  }

  const testsContradictCode =
    testValues.length > 0 &&
    codePatterns.length > 0 &&
    !expectationsAlign(testValues, codePatterns, { allowTemplatePlaceholders: true });

  if (testsContradictCode) {
    return createDriftFinding({
      id: buildFindingId('test', scenario),
      category: 'test',
      livingSpecRef: scenario.livingSpecRef,
      evidenceRefs,
      summary: 'Executable tests contradict observed code behavior for this living-spec scenario.',
      recommendedChange: 'add-test',
    });
  }

  const livingMatchesExecutable =
    expectationsAlign(livingExpectations, testValues, { allowTemplatePlaceholders: false }) ||
    expectationsAlign(livingExpectations, codePatterns, { allowTemplatePlaceholders: true });

  if (livingMatchesExecutable) {
    return createDriftFinding({
      id: buildFindingId('unchanged', scenario),
      category: 'behavior',
      livingSpecRef: scenario.livingSpecRef,
      evidenceRefs,
      summary: 'Living-spec scenario remains unchanged relative to current repository evidence.',
      recommendedChange: 'none',
    });
  }

  return createDriftFinding({
    id: buildFindingId('behavior', scenario),
    category: 'behavior',
    livingSpecRef: scenario.livingSpecRef,
    evidenceRefs,
    summary: `Living-spec expectation ${formatExpectationList(livingExpectations)} no longer matches observed code or test behavior.`,
    recommendedChange: 'update',
  });
}

/**
 * Detects organization drift when multiple scenarios describe the same observable outcome.
 *
 * @param scenarios - Normalized living-spec scenarios from one or more feature files.
 * @returns Merge drift findings for duplicated scenario outcomes.
 */
export function detectMergedScenarios(
  scenarios: readonly NormalizedLivingSpecScenario[],
): DriftFinding[] {
  const grouped = new Map<string, NormalizedLivingSpecScenario[]>();

  for (const scenario of scenarios) {
    const signature = scenario.thenExpectations.join('|');
    const group = grouped.get(signature) ?? [];
    group.push(scenario);
    grouped.set(signature, group);
  }

  const findings: DriftFinding[] = [];

  for (const group of grouped.values()) {
    if (group.length < 2 || group[0]!.thenExpectations.length === 0) {
      continue;
    }

    const primary = group[0]!;
    findings.push(
      createDriftFinding({
        id: `drift-merge-${slugify(primary.behaviorArea)}-${slugify(primary.scenarioName)}`,
        category: 'organization',
        livingSpecRef: primary.livingSpecRef,
        evidenceRefs: group.map((scenario) => scenario.livingSpecRef),
        summary: `Multiple living-spec scenarios share the same observable outcome and should be merged: ${group
          .map((scenario) => scenario.scenarioName)
          .join(', ')}.`,
        recommendedChange: 'merge',
      }),
    );
  }

  return findings;
}

/**
 * Detects organization drift when scenarios lack supporting repository evidence.
 *
 * @param scenarios - Normalized living-spec scenarios to inspect.
 * @param evidence - Repository evidence gathered for the selected scope.
 * @returns Obsolete scenario drift findings.
 */
export function detectObsoleteScenarios(
  scenarios: readonly NormalizedLivingSpecScenario[],
  evidence: readonly RepositoryEvidence[],
): DriftFinding[] {
  const findings: DriftFinding[] = [];

  for (const scenario of scenarios) {
    const supportingEvidence = evidence.filter(
      (record) =>
        record.sourceType !== 'living-spec' &&
        (record.sourceRef.includes(`/${scenario.behaviorArea}/`) ||
          record.behaviorSummary.toLowerCase().includes(scenario.behaviorArea)),
    );

    if (supportingEvidence.length > 0) {
      continue;
    }

    findings.push(
      createDriftFinding({
        id: `drift-obsolete-${slugify(scenario.behaviorArea)}-${slugify(scenario.scenarioName)}`,
        category: 'organization',
        livingSpecRef: scenario.livingSpecRef,
        evidenceRefs: [scenario.livingSpecRef],
        summary:
          'Living-spec scenario appears obsolete because no supporting code, test, or documentation evidence remains in scope.',
        recommendedChange: 'delete',
      }),
    );
  }

  return findings;
}

/**
 * Compares existing living specs with current repository evidence for drift analysis.
 *
 * @param input - Project root and approved discovery plan for the drift run.
 * @returns Drift findings, evidence, and specify injection recommendations.
 */
export async function analyzeLivingSpecDrift(input: {
  projectRoot: string;
  discoveryPlan: DiscoveryPlan;
}): Promise<CollectDriftAnalysisResult> {
  const projectRoot = path.resolve(input.projectRoot);
  const livingSpecPaths =
    input.discoveryPlan.livingSpecTargets.length > 0
      ? input.discoveryPlan.livingSpecTargets
      : [LIVING_SPECS_DIR];
  const scenarios = await loadLivingSpecScenarios(projectRoot, livingSpecPaths);
  const onboarding = await collectOnboardingEvidence({
    projectRoot,
    discoveryPlan: input.discoveryPlan,
  });

  const behaviorContexts = await buildBehaviorComparisonContexts(projectRoot, onboarding);
  const evidence = [...onboarding.evidence, ...buildLivingSpecEvidence(scenarios)];
  const driftFindings: DriftFinding[] = [];
  const questions: RepositoryInjectionQuestion[] = [];
  let findingCounter = 1;

  for (const scenario of scenarios) {
    const context =
      behaviorContexts.get(scenario.behaviorArea) ??
      ({
        codeReturnLiterals: [],
        testExpectedValues: [],
        documentationSummary: '',
      } satisfies ScenarioDriftContext);

    const finding = categorizeScenarioDrift(scenario, evidence, context);
    if (finding == null) {
      continue;
    }

    const finalizedFinding = finalizeFindingId(finding, findingCounter++);
    driftFindings.push(finalizedFinding);

    if (finalizedFinding.recommendedChange === 'update') {
      const authorityQuestion = buildAuthorityQuestion(finalizedFinding, context, scenario);
      if (authorityQuestion != null) {
        questions.push(authorityQuestion);
      }
    }
  }

  driftFindings.push(...detectDocumentationDrift(scenarios, behaviorContexts, evidence));
  driftFindings.push(...detectMergedScenarios(scenarios));
  driftFindings.push(...detectObsoleteScenarios(scenarios, evidence));

  const conflictEvidence = buildConflictEvidence(driftFindings, scenarios, behaviorContexts);
  const assumptions = [
    ...onboarding.assumptions,
    'Unchanged living-spec scenarios are confirmed but not proposed again as duplicate work.',
    'Authority questions have no default source of truth when evidence conflicts.',
  ];

  return {
    evidence: [...evidence, ...conflictEvidence],
    driftFindings,
    proposedLivingSpecChanges: buildProposedChangesFromFindings(driftFindings),
    testCoverageMappings: onboarding.testCoverageMappings,
    testGapRecommendations: onboarding.testGapRecommendations,
    questions,
    assumptions,
  };
}

/**
 * Builds specify-stage injection recommendations from drift analysis output.
 *
 * @param analysis - Drift analysis results gathered for a repository drift run.
 * @returns Proposed living-spec changes excluding unchanged or duplicate additions.
 */
export function buildProposedChangesFromFindings(
  findings: readonly DriftFinding[],
): ProposedLivingSpecChange[] {
  const changes: ProposedLivingSpecChange[] = [];

  for (const finding of findings) {
    if (finding.recommendedChange === 'none') {
      continue;
    }

    const changeType = mapRecommendedChangeToProposal(finding.recommendedChange);
    if (changeType == null) {
      continue;
    }

    changes.push({
      changeType,
      targetRef: finding.livingSpecRef,
      reason: `[${finding.category}] ${finding.summary}`,
    });
  }

  return changes;
}

/**
 * Builds authority questions for conflicting evidence without default assumptions.
 *
 * @param finding - Behavior drift finding requiring maintainer authority.
 * @param context - Code, test, and documentation comparison inputs.
 * @param scenario - Living-spec scenario under review.
 * @returns Authority question or undefined when no conflict exists.
 */
export function buildAuthorityQuestion(
  finding: DriftFinding,
  context: ScenarioDriftContext,
  scenario: NormalizedLivingSpecScenario,
): RepositoryInjectionQuestion | undefined {
  if (finding.recommendedChange !== 'update') {
    return undefined;
  }

  const livingSummary = formatExpectationList(scenario.thenExpectations);
  const executableSummary =
    context.testExpectedValues.length > 0
      ? formatExpectationList(context.testExpectedValues)
      : formatExpectationList(context.codeReturnLiterals);

  if (livingSummary.length === 0 || executableSummary.length === 0) {
    return undefined;
  }

  return {
    id: `authority-${slugify(scenario.behaviorArea)}-${slugify(scenario.scenarioName)}`,
    prompt:
      `Living spec expects ${livingSummary}, while code and tests observe ${executableSummary}. ` +
      'Which source should be authoritative: the existing living spec, code, tests, or documentation?',
  };
}

/**
 * Lists project-relative `.feature` files under scoped paths.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param scopedPaths - Project-relative directories or files to inspect.
 * @returns Sorted unique feature file paths.
 */
async function listFeatureFiles(
  projectRoot: string,
  scopedPaths: readonly string[],
): Promise<string[]> {
  const files = new Set<string>();

  for (const scopedPath of scopedPaths) {
    const normalized = normalizeProjectRelativePath(scopedPath);
    const absolutePath = path.join(projectRoot, normalized);
    if (!(await fse.pathExists(absolutePath))) {
      continue;
    }

    const stats = await fse.stat(absolutePath);
    if (stats.isFile() && absolutePath.endsWith('.feature')) {
      files.add(normalized);
      continue;
    }

    if (stats.isDirectory()) {
      await walkFeatureDirectory(absolutePath, normalized, files);
    }
  }

  return [...files].sort();
}

/**
 * Recursively collects `.feature` files from a directory tree.
 *
 * @param absolutePath - Absolute directory path to walk.
 * @param relativePath - Project-relative path for the current directory.
 * @param files - Accumulator for discovered feature file paths.
 */
async function walkFeatureDirectory(
  absolutePath: string,
  relativePath: string,
  files: Set<string>,
): Promise<void> {
  const entries = await fse.readdir(absolutePath, { withFileTypes: true });

  for (const entry of entries) {
    const entryRelativePath = relativePath === '.' ? entry.name : `${relativePath}/${entry.name}`;
    const entryAbsolutePath = path.join(absolutePath, entry.name);

    if (entry.isDirectory()) {
      await walkFeatureDirectory(entryAbsolutePath, entryRelativePath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.feature')) {
      files.add(entryRelativePath.replace(/\\/g, '/'));
    }
  }
}

/**
 * Converts a parsed Gherkin scenario into a normalized drift comparison record.
 *
 * @param featurePath - Project-relative feature file path.
 * @param behaviorArea - Behavior area slug inferred from the feature file name.
 * @param scenario - Parsed Gherkin scenario from the feature file.
 * @returns Normalized living-spec scenario for drift analysis.
 */
function normalizeScenario(
  featurePath: string,
  behaviorArea: string,
  scenario: GherkinScenario,
): NormalizedLivingSpecScenario {
  const normalizedFeaturePath = featurePath.replace(/\\/g, '/');
  const steps = scenario.steps.map((step) => step.trim()).filter((step) => step.length > 0);

  return {
    livingSpecRef: `${normalizedFeaturePath}:Scenario ${scenario.name}`,
    featurePath: normalizedFeaturePath,
    scenarioName: scenario.name,
    featureTitle: behaviorArea,
    tags: [...scenario.tags],
    steps,
    thenExpectations: extractThenExpectations(steps),
    behaviorArea,
  };
}

/**
 * Extracts quoted observable outcomes from Then steps.
 *
 * @param steps - Scenario step lines including Then clauses.
 * @returns Quoted expectation strings in source order.
 */
function extractThenExpectations(steps: readonly string[]): string[] {
  const expectations: string[] = [];

  for (const step of steps) {
    const trimmed = step.trim();
    if (!/^Then\b/i.test(trimmed)) {
      continue;
    }

    expectations.push(...extractQuotedStrings(trimmed));
  }

  return expectations;
}

/**
 * Extracts quoted substrings from arbitrary text.
 *
 * @param text - Source text containing quoted values.
 * @returns Quoted substrings without surrounding quote characters.
 */
function extractQuotedStrings(text: string): string[] {
  const matches = [...text.matchAll(/["'`]([^"'`]+)["'`]/g)];
  return matches.map((match) => match[1]!);
}

/**
 * Builds comparison contexts for each behavior area discovered in the repository.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param onboarding - Onboarding evidence collection results reused for drift comparison.
 * @returns Map keyed by behavior area slug with comparison inputs.
 */
async function buildBehaviorComparisonContexts(
  projectRoot: string,
  onboarding: CollectOnboardingEvidenceResult,
): Promise<Map<string, ScenarioDriftContext>> {
  const contexts = new Map<string, ScenarioDriftContext>();

  for (const mapping of onboarding.testCoverageMappings) {
    const area = mapping.behaviorId;
    const existing = contexts.get(area) ?? {
      codeReturnLiterals: [],
      testExpectedValues: [],
      documentationSummary: '',
    };

    for (const testRef of mapping.testRefs) {
      const [relativePath] = testRef.split('#');
      if (relativePath == null) {
        continue;
      }

      const absolutePath = path.join(projectRoot, relativePath);
      if (await fse.pathExists(absolutePath)) {
        const content = await fse.readFile(absolutePath, 'utf8');
        contexts.set(area, {
          ...existing,
          testExpectedValues: [
            ...existing.testExpectedValues,
            ...extractTestExpectedValues(content),
          ],
        });
      }
    }
  }

  const sourceFiles = onboarding.evidence
    .filter((record) => record.sourceType === 'code')
    .map((record) => record.sourceRef.split(':')[0])
    .filter((value): value is string => value != null);

  for (const relativePath of new Set(sourceFiles)) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!(await fse.pathExists(absolutePath))) {
      continue;
    }

    const content = await fse.readFile(absolutePath, 'utf8');
    const area = extractBehaviorAreaFromSourcePath(relativePath);
    const existing = contexts.get(area) ?? {
      codeReturnLiterals: [],
      testExpectedValues: [],
      documentationSummary: '',
    };
    contexts.set(area, {
      ...existing,
      codeReturnLiterals: [...existing.codeReturnLiterals, ...extractCodeReturnLiterals(content)],
    });
  }

  for (const record of onboarding.evidence) {
    if (record.sourceType !== 'documentation') {
      continue;
    }

    const area = path.basename(record.sourceRef, path.extname(record.sourceRef));
    const existing = contexts.get(area) ?? {
      codeReturnLiterals: [],
      testExpectedValues: [],
      documentationSummary: '',
    };
    contexts.set(area, {
      ...existing,
      documentationSummary: record.behaviorSummary,
    });
  }

  return contexts;
}

/**
 * Creates repository evidence records for normalized living-spec scenarios.
 *
 * @param scenarios - Normalized living-spec scenarios loaded for drift analysis.
 * @returns Living-spec evidence records for the loaded scenarios.
 */
function buildLivingSpecEvidence(
  scenarios: readonly NormalizedLivingSpecScenario[],
): RepositoryEvidence[] {
  return scenarios.map((scenario, index) =>
    createRepositoryEvidence({
      id: `ev-living-${String(index + 1).padStart(3, '0')}`,
      sourceType: 'living-spec',
      sourceRef: scenario.livingSpecRef,
      behaviorSummary: scenario.scenarioName,
      evidenceKind: 'confirmed-behavior',
      confidence: 'high',
    }),
  );
}

/**
 * Creates conflict evidence records for behavior drift findings.
 *
 * @param findings - Drift findings gathered for the run.
 * @param scenarios - Normalized living-spec scenarios under review.
 * @param contexts - Comparison contexts keyed by behavior area slug.
 * @returns Conflict evidence records for specify injection.
 */
function buildConflictEvidence(
  findings: readonly DriftFinding[],
  scenarios: readonly NormalizedLivingSpecScenario[],
  contexts: ReadonlyMap<string, ScenarioDriftContext>,
): RepositoryEvidence[] {
  const conflicts: RepositoryEvidence[] = [];
  let counter = 1;

  for (const finding of findings) {
    if (finding.recommendedChange !== 'update') {
      continue;
    }

    const scenario = scenarios.find((entry) => entry.livingSpecRef === finding.livingSpecRef);
    if (scenario == null) {
      continue;
    }

    const context = contexts.get(scenario.behaviorArea);
    if (context == null) {
      continue;
    }

    conflicts.push(
      createRepositoryEvidence({
        id: `ev-conflict-${String(counter++).padStart(3, '0')}`,
        sourceType: 'code',
        sourceRef: `${scenario.featurePath}:conflict`,
        behaviorSummary: `Conflicting evidence for ${scenario.scenarioName}: living spec expects ${formatExpectationList(scenario.thenExpectations)} while code/tests observe ${formatExpectationList(context.testExpectedValues.length > 0 ? context.testExpectedValues : context.codeReturnLiterals)}.`,
        evidenceKind: 'conflict',
        confidence: 'medium',
        notes: 'Maintainer authority is required; no default source of truth is assumed.',
      }),
    );
  }

  return conflicts;
}

/**
 * Collects evidence record ids related to one living-spec scenario.
 *
 * @param scenario - Living-spec scenario under review.
 * @param evidence - Repository evidence gathered for the run.
 * @returns Evidence ids supporting the scenario comparison.
 */
function collectScenarioEvidenceRefs(
  scenario: NormalizedLivingSpecScenario,
  evidence: readonly RepositoryEvidence[],
): string[] {
  const refs = evidence
    .filter(
      (record) =>
        record.sourceRef === scenario.livingSpecRef ||
        record.sourceRef.includes(`/${scenario.behaviorArea}/`) ||
        record.behaviorSummary.toLowerCase().includes(scenario.behaviorArea),
    )
    .map((record) => record.id);

  return refs.length > 0 ? [...new Set(refs)] : [scenario.livingSpecRef];
}

/**
 * Returns true when observed values align with living-spec expectations.
 *
 * @param expectations - Living-spec Then expectations.
 * @param observedValues - Code or test literals to compare.
 * @param options - Comparison options such as template placeholder handling.
 * @returns True when all expectations align with observed values.
 */
function expectationsAlign(
  expectations: readonly string[],
  observedValues: readonly string[],
  options: { allowTemplatePlaceholders: boolean },
): boolean {
  if (expectations.length === 0 || observedValues.length === 0) {
    return false;
  }

  return expectations.every((expectation) =>
    observedValues.some((observed) =>
      valuesAlign(expectation, observed, options.allowTemplatePlaceholders),
    ),
  );
}

/**
 * Returns true when one observed value satisfies a living-spec expectation.
 *
 * @param expectation - Living-spec Then expectation text.
 * @param observed - Code or test literal value.
 * @param allowTemplatePlaceholders - Whether `${...}` segments match arbitrary substrings.
 * @returns True when the values align under the comparison rules.
 */
function valuesAlign(
  expectation: string,
  observed: string,
  allowTemplatePlaceholders: boolean,
): boolean {
  const normalizedExpectation = normalizeComparableValue(expectation);
  const normalizedObserved = normalizeComparableValue(observed);

  if (normalizedExpectation === normalizedObserved) {
    return true;
  }

  if (allowTemplatePlaceholders && observed.includes('${')) {
    const pattern = escapeRegex(observed).replace(/\\\$\\\{[^}]+\\\}/g, '.+');
    return new RegExp(`^${pattern}$`).test(expectation);
  }

  return false;
}

/**
 * Detects documentation drift when docs lag behind code and test behavior for an area.
 *
 * @param scenarios - Normalized living-spec scenarios loaded for drift analysis.
 * @param contexts - Comparison contexts keyed by behavior area slug.
 * @param evidence - Repository evidence gathered for the run.
 * @returns Documentation drift findings for stale behavior-area docs.
 */
function detectDocumentationDrift(
  scenarios: readonly NormalizedLivingSpecScenario[],
  contexts: ReadonlyMap<string, ScenarioDriftContext>,
  evidence: readonly RepositoryEvidence[],
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const areas = new Set(scenarios.map((scenario) => scenario.behaviorArea));

  for (const area of areas) {
    const context = contexts.get(area);
    if (context == null || context.documentationSummary.length === 0) {
      continue;
    }

    const representative = scenarios.find((scenario) => scenario.behaviorArea === area);
    if (representative == null) {
      continue;
    }

    const executableSignals = [...context.testExpectedValues, ...context.codeReturnLiterals].join(
      ' ',
    );
    if (executableSignals.length === 0) {
      continue;
    }

    const documentationSummary = context.documentationSummary;
    const staleMarkers = ['!', '?', 'reject', 'error', 'required'];
    const staleDetected = staleMarkers.some(
      (marker) =>
        executableSignals.toLowerCase().includes(marker) &&
        !documentationSummary.toLowerCase().includes(marker),
    );

    if (!staleDetected) {
      continue;
    }

    const evidenceRefs = evidence
      .filter(
        (record) =>
          record.sourceRef.includes(`/${area}/`) ||
          record.sourceRef.includes(`docs/${area}`) ||
          record.sourceType === 'documentation',
      )
      .map((record) => record.id);

    findings.push(
      createDriftFinding({
        id: buildFindingId('documentation', representative),
        category: 'documentation',
        livingSpecRef: representative.featurePath,
        evidenceRefs:
          evidenceRefs.length > 0 ? [...new Set(evidenceRefs)] : [representative.livingSpecRef],
        summary:
          'Documentation wording is stale while executable code and tests reflect updated behavior.',
        recommendedChange: 'refresh-wording',
      }),
    );
  }

  return findings;
}

/**
 * Normalizes strings for drift comparison.
 *
 * @param value - Source value to normalize.
 * @returns Lowercase trimmed comparison string.
 */
function normalizeComparableValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Escapes regular-expression metacharacters in a literal string.
 *
 * @param value - Source string to escape.
 * @returns Escaped string safe for regular-expression construction.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts return literal values from source file content.
 *
 * @param content - Source file contents.
 * @returns Return literal template or string values.
 */
function extractCodeReturnLiterals(content: string): string[] {
  const returnMatches = [...content.matchAll(/return\s+[`'"]([^`'"]+)[`'"]/g)];
  const throwMatches = [...content.matchAll(/throw new Error\s*\(\s*['"`]([^'"`]+)['"`]/g)];
  return [...returnMatches, ...throwMatches].map((match) => match[1]!);
}

/**
 * Extracts literal values asserted in test files.
 *
 * @param content - Test file contents.
 * @returns Literal values from `toBe` and `toThrow` assertions.
 */
function extractTestExpectedValues(content: string): string[] {
  const toBeMatches = [...content.matchAll(/\.toBe\s*\(\s*['"`]([^'"`]+)['"`]/g)];
  const toThrowMatches = [...content.matchAll(/\.toThrow\s*\(\s*['"`]([^'"`]+)['"`]/g)];
  return [...toBeMatches, ...toThrowMatches].map((match) => match[1]!);
}

/**
 * Derives a behavior area slug from a source file path under `src/`.
 *
 * @param relativePath - Project-relative source file path.
 * @returns Behavior area slug used for comparison context lookup.
 */
function extractBehaviorAreaFromSourcePath(relativePath: string): string {
  const segments = relativePath.replace(/\\/g, '/').split('/');
  if (segments[0] === 'src' && segments.length > 2) {
    return segments[1]!;
  }

  return path.basename(relativePath, path.extname(relativePath));
}

/**
 * Maps drift recommended changes to proposed living-spec change types.
 *
 * @param recommendedChange - Drift recommended change intent.
 * @returns Proposed living-spec change type or undefined when no proposal is needed.
 */
function mapRecommendedChangeToProposal(
  recommendedChange: DriftRecommendedChange,
): ProposedLivingSpecChange['changeType'] | undefined {
  switch (recommendedChange) {
    case 'update':
    case 'refresh-wording':
      return 'update';
    case 'delete':
      return 'delete';
    case 'merge':
      return 'merge';
    default:
      return undefined;
  }
}

/**
 * Builds a stable drift finding identifier from category and scenario metadata.
 *
 * @param category - Drift category prefix for the finding id.
 * @param scenario - Living-spec scenario under review.
 * @returns Stable finding id string.
 */
function buildFindingId(category: string, scenario: NormalizedLivingSpecScenario): string {
  return `drift-${category}-${slugify(scenario.behaviorArea)}-${slugify(scenario.scenarioName)}`;
}

/**
 * Replaces a provisional finding id with a run-scoped sequential id when needed.
 *
 * @param finding - Drift finding with a provisional id.
 * @param sequence - One-based sequence number within the run.
 * @returns Drift finding using the run-scoped id.
 */
function finalizeFindingId(finding: DriftFinding, sequence: number): DriftFinding {
  return {
    ...finding,
    id: `drift-${String(sequence).padStart(3, '0')}`,
  };
}

/**
 * Formats expectation values for maintainer-facing summaries.
 *
 * @param expectations - Expectation values to format.
 * @returns Comma-separated quoted expectation list.
 */
function formatExpectationList(expectations: readonly string[]): string {
  if (expectations.length === 0) {
    return '';
  }

  return expectations.map((value) => `"${value}"`).join(', ');
}

/**
 * Converts arbitrary text to a kebab-case slug for ids.
 *
 * @param value - Source text to slugify.
 * @returns Kebab-case slug suitable for finding and question ids.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
