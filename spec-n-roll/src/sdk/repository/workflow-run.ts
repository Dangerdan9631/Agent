import path from 'node:path';

import fse from 'fs-extra';

import type {
  DiscoveryPlan,
  DiscoveryPlanBounds,
  DriftFinding,
  RepositoryEvidence,
  RepositoryWorkflowRunStatus,
  RepositoryWorkflowType,
  RepositoryWorkflowTypeId,
  RepositoryWorkflowScope,
  SpecifyStageInjection,
  TestCoverageMapping,
} from '../config/schema.js';
import { taskSpecRelativeDir } from '../core/paths.js';
import type { InterviewQuestion } from '../specs/interview.js';
import { runSpecify } from '../specs/specify.js';
import type { TriageAssessment } from '../specs/triage.js';
import { readWorkflowConfig, WORKFLOW_CONFIG_RELATIVE_PATH } from '../workflow/artifacts.js';
import {
  buildNextSuggestedScopedRun,
  normalizeApprovedDiscoveryPlan,
  recommendDiscoveryPlan,
  type DiscoveryPlanBuilderInput,
  type NextSuggestedScopedRun,
} from './discovery-plan.js';
import { collectOnboardingEvidence, groupTestCoverageByType } from './evidence.js';
import { analyzeLivingSpecDrift, loadLivingSpecScenarios } from './drift.js';
import { repositoryWorkflowReportRelativePath, writeRepositoryWorkflowReport } from './report.js';
import type { NormalizedLivingSpecScenario } from './drift.js';

/**
 * Project-relative directories that repository workflows must not mutate during specify.
 */
export const AUTHORITATIVE_SNAPSHOT_DIRECTORIES = ['living-specs', 'tests'] as const;

/**
 * Machine-readable blocker codes for repository workflow safety boundaries.
 */
export type RepositoryWorkflowBlockerCode =
  | 'MISSING_LIVING_SPECS'
  | 'DISCOVERY_SCOPE_UNAVAILABLE'
  | 'AUTHORITATIVE_MUTATION';

/**
 * Maintainer-facing blocker returned when repository workflow analysis cannot proceed safely.
 */
export interface RepositoryWorkflowBlocker {
  /**
   * Machine-readable blocker code for CLI, MCP, and Ink surfaces.
   */
  code: RepositoryWorkflowBlockerCode;
  /**
   * Short explanation of why the workflow stopped.
   */
  message: string;
  /**
   * Actionable guidance for resolving the blocker before retrying.
   */
  stoppingGuidance: string;
}

/**
 * Result returned when a repository workflow stops with a safety blocker.
 */
export interface BlockedRepositoryWorkflowResult {
  /**
   * Lifecycle status for a blocked repository workflow run.
   */
  status: 'blocked';
  /**
   * Repository workflow type that was attempted.
   */
  workflowTypeId: RepositoryWorkflowTypeId;
  /**
   * Blocker details explaining why the run stopped.
   */
  blocker: RepositoryWorkflowBlocker;
  /**
   * Recommended next actions for the maintainer.
   */
  nextSteps: string[];
}

/**
 * Union of successful and blocked repository onboarding workflow results.
 */
export type RepositoryOnboardingWorkflowResult =
  | CompleteRepositoryOnboardingResult
  | BlockedRepositoryWorkflowResult;

/**
 * Union of successful and blocked repository drift workflow results.
 */
export type RepositoryDriftWorkflowResult =
  | CompleteRepositoryDriftResult
  | BlockedRepositoryWorkflowResult;

/**
 * Error thrown when repository workflow specify execution mutates authoritative files.
 */
export class RepositoryWorkflowSafetyError extends Error {
  /**
   * Blocker details describing the authoritative mutation violation.
   */
  readonly blocker: RepositoryWorkflowBlocker;

  /**
   * @param blocker - Blocker details for the safety violation.
   */
  constructor(blocker: RepositoryWorkflowBlocker) {
    super(blocker.message);
    this.name = 'RepositoryWorkflowSafetyError';
    this.blocker = blocker;
  }
}

export type {
  DiscoveryPlan,
  DriftFinding,
  LivingSpecCoverageRequirement,
  RepositoryEvidence,
  RepositorySpecifyInjectionTemplate,
  RepositoryWorkflowRunStatus,
  RepositoryWorkflowType,
  RepositoryWorkflowTypeId,
  TestCoverageMapping,
} from '../config/schema.js';

/**
 * Stable repository workflow type identifiers.
 */
export const REPOSITORY_WORKFLOW_TYPE_IDS = [
  'repository-onboarding',
  'repository-drift',
] as const satisfies readonly RepositoryWorkflowTypeId[];

/**
 * Metadata for supported repository workflow types.
 */
export const REPOSITORY_WORKFLOW_TYPES: readonly RepositoryWorkflowType[] = [
  {
    id: 'repository-onboarding',
    name: 'Repository Onboarding',
    description:
      'Discover behavior evidence and propose living-spec and test work for areas without living specs.',
    requiresLivingSpecs: 'absent-or-partial',
    specifyInjectionTemplate: {
      instructions: [
        'Describe living-spec and test work as future downstream changes.',
        'Preserve standard specify headings and quality checklist compatibility.',
        'Record unresolved ambiguity instead of blocking specify completion.',
      ],
      sections: [
        'Repository Discovery Evidence',
        'Proposed Living Spec Changes',
        'Test Coverage Mapping',
        'Unresolved Ambiguity',
        'Assumptions and Limitations',
      ],
    },
  },
  {
    id: 'repository-drift',
    name: 'Repository Drift',
    description:
      'Compare existing living specs to current code, tests, and documentation and propose refresh work.',
    requiresLivingSpecs: 'present',
    specifyInjectionTemplate: {
      instructions: [
        'Categorize drift without duplicating unchanged living specs.',
        'Record authority questions when evidence sources conflict.',
        'Do not mutate living specs or tests during specify.',
      ],
      sections: [
        'Repository Discovery Evidence',
        'Proposed Living Spec Changes',
        'Test Coverage Mapping',
        'Unresolved Ambiguity',
        'Assumptions and Limitations',
      ],
    },
  },
] as const;

/**
 * One execution of repository onboarding or repository drift.
 */
export interface RepositoryWorkflowRun {
  /**
   * Stable id for the run, usually task spec id plus slug.
   */
  runId: string;
  /**
   * Selected repository workflow type id.
   */
  workflowTypeId: RepositoryWorkflowTypeId;
  /**
   * Approved discovery scope for the run.
   */
  discoveryPlan: DiscoveryPlan;
  /**
   * Repository evidence records gathered for the run.
   */
  evidence: RepositoryEvidence[];
  /**
   * Categorized drift findings for repository drift runs.
   */
  driftFindings: DriftFinding[];
  /**
   * Direct, indirect, missing, or unknown validation mappings for discovered behavior.
   */
  testCoverageMappings: TestCoverageMapping[];
  /**
   * Project-relative path to the produced specify-stage output.
   */
  specifyOutputRef: string;
  /**
   * Project-relative path to the workflow report artifact.
   */
  reportPath: string;
  /**
   * Current lifecycle status for the run.
   */
  status: RepositoryWorkflowRunStatus;
  /**
   * ISO 8601 timestamp when the run was created.
   */
  createdAt?: string;
  /**
   * ISO 8601 timestamp when the run completed or was blocked.
   */
  completedAt?: string;
}

/**
 * Result of checking whether a project has Spec-n-Roll scaffolding for repository workflows.
 */
export interface RepositoryWorkflowInitializationCheck {
  /**
   * True when workflow configuration exists and the project can start repository workflows.
   */
  initialized: boolean;
  /**
   * Maintainer-facing blocking message when initialization is missing.
   */
  blockingMessage?: string;
}

/**
 * Returns repository workflow type metadata for a supported workflow type id.
 *
 * @param workflowTypeId - Repository workflow type id to resolve.
 * @returns Matching workflow type metadata.
 */
export function getRepositoryWorkflowType(
  workflowTypeId: RepositoryWorkflowTypeId,
): RepositoryWorkflowType {
  const workflowType = REPOSITORY_WORKFLOW_TYPES.find((entry) => entry.id === workflowTypeId);
  if (workflowType == null) {
    throw new Error(`Unknown repository workflow type id: ${workflowTypeId}`);
  }

  return workflowType;
}

/**
 * Checks whether a project root has the Spec-n-Roll scaffolding required for repository workflows.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Initialization check with a blocking message when scaffolding is missing.
 */
export async function checkRepositoryWorkflowInitialization(
  projectRoot: string,
): Promise<RepositoryWorkflowInitializationCheck> {
  const resolvedRoot = path.resolve(projectRoot);
  const workflowConfig = await readWorkflowConfig(resolvedRoot);

  if (workflowConfig == null) {
    return {
      initialized: false,
      blockingMessage:
        `Project is not initialized. Run \`spec-n-roll init\` before starting a repository workflow. ` +
        `Missing ${WORKFLOW_CONFIG_RELATIVE_PATH}.`,
    };
  }

  return { initialized: true };
}

/**
 * Asserts that a project root is initialized before repository workflow work begins.
 *
 * @param projectRoot - Absolute path to the project root.
 * @throws Error when workflow configuration is missing.
 */
export async function assertRepositoryWorkflowInitialized(projectRoot: string): Promise<void> {
  const check = await checkRepositoryWorkflowInitialization(projectRoot);
  if (!check.initialized) {
    throw new Error(check.blockingMessage);
  }
}

/**
 * Returns metadata for all supported repository workflow types.
 *
 * @returns Repository workflow type definitions for CLI, MCP, and Ink listings.
 */
export function listRepositoryWorkflowTypes(): readonly RepositoryWorkflowType[] {
  return REPOSITORY_WORKFLOW_TYPES;
}

/**
 * Input for starting a repository workflow and recommending a discovery plan.
 */
export interface StartRepositoryWorkflowInput {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Repository workflow type id to start.
   */
  workflowTypeId: RepositoryWorkflowTypeId;
  /**
   * Optional maintainer-provided scope hints.
   */
  scope?: RepositoryWorkflowScope;
  /**
   * Optional maintainer-provided goal text for the run.
   */
  description?: string;
  /**
   * Optional bounded discovery limits for large repositories.
   */
  bounds?: DiscoveryPlanBounds;
}

/**
 * Result returned when a repository workflow is started successfully.
 */
export interface StartRepositoryWorkflowResult {
  /**
   * Selected repository workflow type id.
   */
  workflowTypeId: RepositoryWorkflowTypeId;
  /**
   * Recommended discovery plan awaiting maintainer approval.
   */
  recommendedPlan: DiscoveryPlan;
  /**
   * True when the workflow requires maintainer approval before discovery begins.
   */
  requiresApproval: boolean;
  /**
   * True when Spec-n-Roll scaffolding is present.
   */
  initialized: boolean;
}

/**
 * Result returned when a repository workflow discovery plan is recommended.
 */
export interface RepositoryWorkflowPlanResult {
  /**
   * Selected repository workflow type id.
   */
  workflowTypeId: RepositoryWorkflowTypeId;
  /**
   * Recommended discovery plan awaiting maintainer approval.
   */
  recommendedPlan: DiscoveryPlan;
  /**
   * True when the workflow requires maintainer approval before discovery begins.
   */
  requiresApproval: boolean;
  /**
   * True when Spec-n-Roll scaffolding is present.
   */
  initialized: boolean;
  /**
   * Follow-up scoped run suggestion when the plan defers product areas.
   */
  nextSuggestedScopedRun?: NextSuggestedScopedRun;
}

/**
 * Options for completing a repository onboarding workflow through specify.
 */
export interface RunRepositoryOnboardingOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Natural-language goal for the onboarding run.
   */
  description?: string;
  /**
   * Optional maintainer-provided scope hints.
   */
  scope?: RepositoryWorkflowScope;
  /**
   * Optional maintainer-approved discovery plan override.
   */
  approvedPlan?: DiscoveryPlan;
  /**
   * Optional explicit set list id override for embedded specify triage.
   */
  setListOverride?: string;
  /**
   * Confirms or overrides triage during embedded specify.
   */
  confirmTriage?: (assessment: TriageAssessment) => Promise<string>;
  /**
   * Supplies an answer for each specify interview question.
   */
  answerInterview?: (question: InterviewQuestion) => Promise<string>;
}

/**
 * Summary counts for test coverage mappings in an onboarding run.
 */
export interface RepositoryTestMappingSummary {
  /**
   * Number of behavior areas with direct test coverage.
   */
  direct: number;
  /**
   * Number of behavior areas with indirect test coverage.
   */
  indirect: number;
  /**
   * Number of behavior areas with missing test coverage.
   */
  missing: number;
  /**
   * Number of behavior areas with unknown test coverage.
   */
  unknown: number;
}

/**
 * Result returned when repository onboarding completes after specify.
 */
export interface CompleteRepositoryOnboardingResult {
  /**
   * Lifecycle status for the completed onboarding run.
   */
  status: 'complete';
  /**
   * Allocated numeric task spec id for the produced feature spec.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Project-relative path to the produced specify-stage output.
   */
  specifyOutputRef: string;
  /**
   * Project-relative path to the workflow report artifact.
   */
  reportPath: string;
  /**
   * Recommended downstream workflow steps after specify.
   */
  nextSteps: string[];
  /**
   * Direct, indirect, missing, or unknown validation mappings for discovered behavior.
   */
  testCoverageMappings: TestCoverageMapping[];
  /**
   * Counts of behavior areas by test coverage relationship type.
   */
  testMappingSummary: RepositoryTestMappingSummary;
  /**
   * Maintainer-approved discovery plan used for the run.
   */
  discoveryPlan: DiscoveryPlan;
  /**
   * Structured repository workflow run summary.
   */
  run: RepositoryWorkflowRun;
}

/**
 * Options for completing a repository drift workflow through specify.
 */
export interface RunRepositoryDriftOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Natural-language goal for the drift run.
   */
  description?: string;
  /**
   * Optional maintainer-provided scope hints.
   */
  scope?: RepositoryWorkflowScope;
  /**
   * Optional maintainer-approved discovery plan override.
   */
  approvedPlan?: DiscoveryPlan;
  /**
   * Optional explicit set list id override for embedded specify triage.
   */
  setListOverride?: string;
  /**
   * Confirms or overrides triage during embedded specify.
   */
  confirmTriage?: (assessment: TriageAssessment) => Promise<string>;
  /**
   * Supplies an answer for each specify interview question.
   */
  answerInterview?: (question: InterviewQuestion) => Promise<string>;
}

/**
 * Result returned when repository drift completes after specify.
 */
export interface CompleteRepositoryDriftResult {
  /**
   * Lifecycle status for the completed drift run.
   */
  status: 'complete';
  /**
   * Allocated numeric task spec id for the produced feature spec.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Project-relative path to the produced specify-stage output.
   */
  specifyOutputRef: string;
  /**
   * Project-relative path to the workflow report artifact.
   */
  reportPath: string;
  /**
   * Recommended downstream workflow steps after specify.
   */
  nextSteps: string[];
  /**
   * Direct, indirect, missing, or unknown validation mappings for discovered behavior.
   */
  testCoverageMappings: TestCoverageMapping[];
  /**
   * Counts of behavior areas by test coverage relationship type.
   */
  testMappingSummary: RepositoryTestMappingSummary;
  /**
   * Structured repository workflow run summary.
   */
  run: RepositoryWorkflowRun;
}

/**
 * Recommends a default discovery plan for repository drift.
 *
 * @param input - Project root, workflow mode, and optional scope or bounds hints.
 * @returns Parsed discovery plan ready for maintainer approval.
 */
export async function recommendDriftDiscoveryPlan(
  input: DiscoveryPlanBuilderInput & { projectRoot: string },
): Promise<DiscoveryPlan> {
  return recommendDiscoveryPlan({
    ...input,
    mode: 'repository-drift',
  });
}

/**
 * Returns true when a repository workflow result ended with a safety blocker.
 *
 * @param result - Repository onboarding or drift workflow result.
 * @returns True when the workflow stopped with `status: blocked`.
 */
export function isBlockedRepositoryWorkflowResult(
  result: RepositoryOnboardingWorkflowResult | RepositoryDriftWorkflowResult,
): result is BlockedRepositoryWorkflowResult {
  return result.status === 'blocked';
}

/**
 * Builds a blocked repository workflow result with maintainer stopping guidance.
 *
 * @param workflowTypeId - Repository workflow type that was attempted.
 * @param blocker - Blocker details explaining why the run stopped.
 * @returns Blocked workflow result without partial specify artifacts.
 */
export function buildBlockedRepositoryWorkflowResult(
  workflowTypeId: RepositoryWorkflowTypeId,
  blocker: RepositoryWorkflowBlocker,
): BlockedRepositoryWorkflowResult {
  return {
    status: 'blocked',
    workflowTypeId,
    blocker,
    nextSteps: ['resolve-blocker', 'retry-workflow'],
  };
}

/**
 * Snapshots file contents under authoritative repository workflow directories.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Map of project-relative file paths to UTF-8 file contents.
 */
export async function snapshotAuthoritativeProjectDirectories(
  projectRoot: string,
): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();

  for (const directoryName of AUTHORITATIVE_SNAPSHOT_DIRECTORIES) {
    const absoluteDirectory = path.join(projectRoot, directoryName);
    if (!(await fse.pathExists(absoluteDirectory))) {
      continue;
    }

    async function walk(currentPath: string, relativePrefix: string): Promise<void> {
      const entries = await fse.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const relativePath =
          relativePrefix.length > 0 ? `${relativePrefix}/${entry.name}` : entry.name;
        const absolutePath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await walk(absolutePath, relativePath);
        } else if (entry.isFile()) {
          const normalizedPath = relativePath.replace(/\\/g, '/');
          snapshot.set(normalizedPath, await fse.readFile(absolutePath, 'utf8'));
        }
      }
    }

    await walk(absoluteDirectory, directoryName);
  }

  return snapshot;
}

/**
 * Returns true when authoritative directory snapshots differ between two captures.
 *
 * @param before - Snapshot captured before repository workflow specify began.
 * @param after - Snapshot captured after repository workflow specify completed.
 * @returns True when any authoritative file path or content changed.
 */
function authoritativeSnapshotsDiffer(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): boolean {
  for (const [filePath, beforeContent] of before.entries()) {
    if (after.get(filePath) !== beforeContent) {
      return true;
    }
  }

  for (const filePath of after.keys()) {
    if (!before.has(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Asserts that authoritative directory snapshots are unchanged after specify execution.
 *
 * @param before - Snapshot captured before repository workflow specify began.
 * @param after - Snapshot captured after repository workflow specify completed.
 * @throws RepositoryWorkflowSafetyError when living-spec or test files changed.
 */
export function assertAuthoritativeSnapshotUnchanged(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): void {
  const changedPaths: string[] = [];

  for (const [filePath, beforeContent] of before.entries()) {
    const afterContent = after.get(filePath);
    if (afterContent !== beforeContent) {
      changedPaths.push(filePath);
    }
  }

  for (const filePath of after.keys()) {
    if (!before.has(filePath)) {
      changedPaths.push(filePath);
    }
  }

  if (changedPaths.length === 0) {
    return;
  }

  throw new RepositoryWorkflowSafetyError({
    code: 'AUTHORITATIVE_MUTATION',
    message:
      'Repository workflow specify mutated authoritative living-spec or test files: ' +
      `${changedPaths.join(', ')}.`,
    stoppingGuidance:
      'Living-spec and test changes belong in downstream plan, tasks, and implement. ' +
      'Retry after removing unintended file writes from the specify stage.',
  });
}

/**
 * Runs specify for a repository workflow inside a no-mutation snapshot guard.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param run - Specify callback executed between authoritative directory snapshots.
 * @returns Specify result when authoritative files remain unchanged.
 */
export async function runRepositoryWorkflowSpecifyWithMutationGuard<T>(
  projectRoot: string,
  run: () => Promise<T>,
): Promise<T> {
  const beforeSnapshot = await snapshotAuthoritativeProjectDirectories(projectRoot);

  try {
    const result = await run();
    const afterSnapshot = await snapshotAuthoritativeProjectDirectories(projectRoot);
    assertAuthoritativeSnapshotUnchanged(beforeSnapshot, afterSnapshot);
    return result;
  } catch (error) {
    const afterSnapshot = await snapshotAuthoritativeProjectDirectories(projectRoot);
    if (authoritativeSnapshotsDiffer(beforeSnapshot, afterSnapshot)) {
      assertAuthoritativeSnapshotUnchanged(beforeSnapshot, afterSnapshot);
    }
    throw error;
  }
}

/**
 * Evaluates repository drift prerequisites before specify-stage work begins.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param scenarios - Living-spec scenarios discovered for the approved plan.
 * @returns Blocker details when drift cannot proceed safely.
 */
export async function evaluateRepositoryDriftWorkflowBlockers(
  projectRoot: string,
  scenarios: readonly NormalizedLivingSpecScenario[],
): Promise<RepositoryWorkflowBlocker | undefined> {
  if (scenarios.length > 0) {
    return undefined;
  }

  const livingSpecsDir = path.join(projectRoot, 'living-specs');
  const hasLivingSpecsDirectory = await fse.pathExists(livingSpecsDir);

  return {
    code: 'MISSING_LIVING_SPECS',
    message: 'Repository drift requires existing living specs in the approved discovery scope.',
    stoppingGuidance: hasLivingSpecsDirectory
      ? 'Include living-spec `.feature` files in the approved scope or run repository-onboarding for uncovered areas.'
      : 'Run repository-onboarding for areas without living specs, or add living specs before running drift.',
  };
}

/**
 * Evaluates discovery scope prerequisites before repository workflow specify begins.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param discoveryPlan - Maintainer-approved discovery plan for the run.
 * @returns Blocker details when no in-scope paths are available for analysis.
 */
export async function evaluateRepositoryDiscoveryScopeBlockers(
  projectRoot: string,
  discoveryPlan: DiscoveryPlan,
): Promise<RepositoryWorkflowBlocker | undefined> {
  let availablePaths = 0;

  for (const includedPath of discoveryPlan.includedPaths) {
    if (await fse.pathExists(path.join(projectRoot, includedPath))) {
      availablePaths += 1;
    }
  }

  if (availablePaths > 0) {
    return undefined;
  }

  return {
    code: 'DISCOVERY_SCOPE_UNAVAILABLE',
    message: 'Repository workflow discovery scope does not include any existing project paths.',
    stoppingGuidance:
      'Revise the approved discovery plan to include at least one existing project-relative path, ' +
      'then retry the workflow.',
  };
}

/**
 * Builds specify-stage injection from drift analysis and workflow metadata.
 *
 * @param workflowTypeId - Repository workflow type producing the injection.
 * @param analysis - Drift analysis results gathered for the run.
 * @returns Parsed specify-stage injection payload.
 */
export function buildDriftSpecifyInjection(
  workflowTypeId: RepositoryWorkflowTypeId,
  analysis: Awaited<ReturnType<typeof analyzeLivingSpecDrift>>,
): SpecifyStageInjection {
  const workflowType = getRepositoryWorkflowType(workflowTypeId);

  return {
    workflowTypeId,
    instructions: [...workflowType.specifyInjectionTemplate.instructions],
    evidenceSummary: analysis.evidence,
    proposedLivingSpecChanges: analysis.proposedLivingSpecChanges,
    testGapRecommendations: analysis.testGapRecommendations,
    testCoverageMappings: analysis.testCoverageMappings,
    questions: analysis.questions,
    assumptions: analysis.assumptions,
    driftFindings: analysis.driftFindings,
  };
}

/**
 * Runs repository drift through discovery, specify injection, and specify completion.
 *
 * @param options - Drift scope, interview callbacks, and optional approved plan.
 * @returns Completed or blocked drift result ending after specify or a safety blocker.
 */
export async function runRepositoryDriftWorkflow(
  options: RunRepositoryDriftOptions,
): Promise<RepositoryDriftWorkflowResult> {
  const projectRoot = path.resolve(options.projectRoot);
  await assertRepositoryWorkflowInitialized(projectRoot);

  const workflowTypeId = 'repository-drift';
  const workflowType = getRepositoryWorkflowType(workflowTypeId);
  const approvedPlan = normalizeApprovedDiscoveryPlan(
    projectRoot,
    options.approvedPlan ??
      (await recommendDriftDiscoveryPlan({
        projectRoot,
        mode: workflowTypeId,
        scope: options.scope,
      })),
  );

  const scopeBlocker = await evaluateRepositoryDiscoveryScopeBlockers(projectRoot, approvedPlan);
  if (scopeBlocker != null) {
    return buildBlockedRepositoryWorkflowResult(workflowTypeId, scopeBlocker);
  }

  const livingSpecPaths =
    approvedPlan.livingSpecTargets.length > 0 ? approvedPlan.livingSpecTargets : ['living-specs'];
  const livingSpecScenarios = await loadLivingSpecScenarios(projectRoot, livingSpecPaths);
  const driftBlocker = await evaluateRepositoryDriftWorkflowBlockers(
    projectRoot,
    livingSpecScenarios,
  );
  if (driftBlocker != null) {
    return buildBlockedRepositoryWorkflowResult(workflowTypeId, driftBlocker);
  }

  const analysis = await analyzeLivingSpecDrift({
    projectRoot,
    discoveryPlan: approvedPlan,
  });
  const specifyInjection = buildDriftSpecifyInjection(workflowTypeId, analysis);
  const description =
    options.description?.trim() ||
    'Propose living-spec refresh work for drift between existing specs and repository evidence.';

  let specifyResult: Awaited<ReturnType<typeof runSpecify>>;
  try {
    specifyResult = await runRepositoryWorkflowSpecifyWithMutationGuard(projectRoot, () =>
      runSpecify({
        projectRoot,
        description,
        slug: 'repository-living-spec-drift',
        setListOverride: options.setListOverride,
        confirmTriage: options.confirmTriage,
        answerInterview: options.answerInterview,
        specifyInjection,
      }),
    );
  } catch (error) {
    if (error instanceof RepositoryWorkflowSafetyError) {
      return buildBlockedRepositoryWorkflowResult(workflowTypeId, error.blocker);
    }
    throw error;
  }

  const specifyOutputRef = `${taskSpecRelativeDir(specifyResult.taskSpecId, specifyResult.slug)}/spec.md`;
  const reportPath = repositoryWorkflowReportRelativePath(
    specifyResult.taskSpecId,
    specifyResult.slug,
  );

  await writeRepositoryWorkflowReport(projectRoot, specifyResult.taskSpecId, specifyResult.slug, {
    workflowTypeName: workflowType.name,
    specifyOutputRef,
    discoveryPlan: approvedPlan,
    evidence: analysis.evidence,
    driftFindings: analysis.driftFindings,
    testCoverageMappings: analysis.testCoverageMappings,
    testGapRecommendations: analysis.testGapRecommendations,
    assumptions: analysis.assumptions,
    limitations: 'Living-spec and test files are not modified during repository drift specify.',
    nextSteps: ['clarify', 'plan', 'tasks', 'implement'],
  });

  const run: RepositoryWorkflowRun = {
    runId: `${specifyResult.taskSpecId}-${specifyResult.slug}`,
    workflowTypeId,
    discoveryPlan: approvedPlan,
    evidence: analysis.evidence,
    driftFindings: analysis.driftFindings,
    testCoverageMappings: analysis.testCoverageMappings,
    specifyOutputRef,
    reportPath,
    status: 'complete',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  return {
    status: 'complete',
    taskSpecId: specifyResult.taskSpecId,
    slug: specifyResult.slug,
    specifyOutputRef,
    reportPath,
    nextSteps: ['clarify', 'plan', 'tasks', 'implement'],
    testCoverageMappings: analysis.testCoverageMappings,
    testMappingSummary: buildTestMappingSummary(analysis.testCoverageMappings),
    run,
  };
}

/**
 * Recommends a default discovery plan for repository onboarding.
 *
 * @param input - Project root, workflow mode, and optional scope or bounds hints.
 * @returns Parsed discovery plan ready for maintainer approval.
 */
export async function recommendOnboardingDiscoveryPlan(
  input: DiscoveryPlanBuilderInput & { projectRoot: string },
): Promise<DiscoveryPlan> {
  return recommendDiscoveryPlan({
    ...input,
    mode: 'repository-onboarding',
  });
}

/**
 * Recommends a discovery plan without starting repository analysis.
 *
 * @param input - Workflow type, project root, and optional scope or bounds hints.
 * @returns Recommended discovery plan and optional follow-up scoped run suggestion.
 */
export async function planRepositoryWorkflow(
  input: StartRepositoryWorkflowInput,
): Promise<RepositoryWorkflowPlanResult> {
  const startResult = await startRepositoryWorkflow(input);

  return {
    ...startResult,
    nextSuggestedScopedRun: buildNextSuggestedScopedRun(startResult.recommendedPlan.omittedPaths),
  };
}

/**
 * Starts a repository workflow after verifying initialization and recommending scope.
 *
 * @param input - Workflow type, project root, and optional scope hints.
 * @returns Recommended discovery plan and approval requirements.
 */
export async function startRepositoryWorkflow(
  input: StartRepositoryWorkflowInput,
): Promise<StartRepositoryWorkflowResult> {
  const projectRoot = path.resolve(input.projectRoot);
  const initialization = await checkRepositoryWorkflowInitialization(projectRoot);
  if (!initialization.initialized) {
    throw new Error(initialization.blockingMessage);
  }

  getRepositoryWorkflowType(input.workflowTypeId);

  const recommendedPlan = await recommendDiscoveryPlan({
    projectRoot,
    mode: input.workflowTypeId,
    scope: input.scope,
    bounds: input.bounds,
  });

  return {
    workflowTypeId: input.workflowTypeId,
    recommendedPlan,
    requiresApproval: true,
    initialized: true,
  };
}

/**
 * Builds specify-stage injection from onboarding evidence and workflow metadata.
 *
 * @param workflowTypeId - Repository workflow type producing the injection.
 * @param discovery - Collected onboarding evidence and recommendations.
 * @returns Parsed specify-stage injection payload.
 */
export function buildOnboardingSpecifyInjection(
  workflowTypeId: RepositoryWorkflowTypeId,
  discovery: Awaited<ReturnType<typeof collectOnboardingEvidence>>,
): SpecifyStageInjection {
  const workflowType = getRepositoryWorkflowType(workflowTypeId);

  return {
    workflowTypeId,
    instructions: [...workflowType.specifyInjectionTemplate.instructions],
    evidenceSummary: discovery.evidence,
    proposedLivingSpecChanges: discovery.proposedLivingSpecChanges,
    testGapRecommendations: discovery.testGapRecommendations,
    testCoverageMappings: discovery.testCoverageMappings,
    questions: discovery.questions,
    assumptions: discovery.assumptions,
    driftFindings: [],
  };
}

/**
 * Builds a summary of test coverage mapping counts for onboarding responses.
 *
 * @param mappings - Test coverage mappings gathered during discovery.
 * @returns Counts grouped by coverage relationship type.
 */
export function buildTestMappingSummary(
  mappings: readonly TestCoverageMapping[],
): RepositoryTestMappingSummary {
  const grouped = groupTestCoverageByType(mappings);

  return {
    direct: grouped.get('direct')?.length ?? 0,
    indirect: grouped.get('indirect')?.length ?? 0,
    missing: grouped.get('missing')?.length ?? 0,
    unknown: grouped.get('unknown')?.length ?? 0,
  };
}

/**
 * Runs repository onboarding through discovery, specify injection, and specify completion.
 *
 * @param options - Onboarding scope, interview callbacks, and optional approved plan.
 * @returns Completed or blocked onboarding result ending after specify or a safety blocker.
 */
export async function runRepositoryOnboardingWorkflow(
  options: RunRepositoryOnboardingOptions,
): Promise<RepositoryOnboardingWorkflowResult> {
  const projectRoot = path.resolve(options.projectRoot);
  await assertRepositoryWorkflowInitialized(projectRoot);

  const workflowTypeId = 'repository-onboarding';
  const workflowType = getRepositoryWorkflowType(workflowTypeId);
  const approvedPlan = normalizeApprovedDiscoveryPlan(
    projectRoot,
    options.approvedPlan ??
      (await recommendOnboardingDiscoveryPlan({
        projectRoot,
        mode: workflowTypeId,
        scope: options.scope,
      })),
  );

  const scopeBlocker = await evaluateRepositoryDiscoveryScopeBlockers(projectRoot, approvedPlan);
  if (scopeBlocker != null) {
    return buildBlockedRepositoryWorkflowResult(workflowTypeId, scopeBlocker);
  }

  const discovery = await collectOnboardingEvidence({
    projectRoot,
    discoveryPlan: approvedPlan,
  });
  const specifyInjection = buildOnboardingSpecifyInjection(workflowTypeId, discovery);
  const description =
    options.description?.trim() ||
    'Propose living-spec and test work for discovered repository behavior.';

  let specifyResult: Awaited<ReturnType<typeof runSpecify>>;
  try {
    specifyResult = await runRepositoryWorkflowSpecifyWithMutationGuard(projectRoot, () =>
      runSpecify({
        projectRoot,
        description,
        slug: 'repository-living-specs',
        setListOverride: options.setListOverride,
        confirmTriage: options.confirmTriage,
        answerInterview: options.answerInterview,
        specifyInjection,
      }),
    );
  } catch (error) {
    if (error instanceof RepositoryWorkflowSafetyError) {
      return buildBlockedRepositoryWorkflowResult(workflowTypeId, error.blocker);
    }
    throw error;
  }

  const specifyOutputRef = `${taskSpecRelativeDir(specifyResult.taskSpecId, specifyResult.slug)}/spec.md`;
  const reportPath = repositoryWorkflowReportRelativePath(
    specifyResult.taskSpecId,
    specifyResult.slug,
  );

  await writeRepositoryWorkflowReport(projectRoot, specifyResult.taskSpecId, specifyResult.slug, {
    workflowTypeName: workflowType.name,
    specifyOutputRef,
    discoveryPlan: approvedPlan,
    evidence: discovery.evidence,
    driftFindings: [],
    testCoverageMappings: discovery.testCoverageMappings,
    testGapRecommendations: discovery.testGapRecommendations,
    assumptions: discovery.assumptions,
    limitations:
      'Living-spec and test files are not modified during repository onboarding specify.',
    nextSteps: ['clarify', 'plan', 'tasks', 'implement'],
    nextSuggestedScopedRun: buildNextSuggestedScopedRun(approvedPlan.omittedPaths),
  });

  const run: RepositoryWorkflowRun = {
    runId: `${specifyResult.taskSpecId}-${specifyResult.slug}`,
    workflowTypeId,
    discoveryPlan: approvedPlan,
    evidence: discovery.evidence,
    driftFindings: [],
    testCoverageMappings: discovery.testCoverageMappings,
    specifyOutputRef,
    reportPath,
    status: 'complete',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  return {
    status: 'complete',
    taskSpecId: specifyResult.taskSpecId,
    slug: specifyResult.slug,
    specifyOutputRef,
    reportPath,
    nextSteps: ['clarify', 'plan', 'tasks', 'implement'],
    testCoverageMappings: discovery.testCoverageMappings,
    testMappingSummary: buildTestMappingSummary(discovery.testCoverageMappings),
    discoveryPlan: approvedPlan,
    run,
  };
}
