import path from 'node:path';

import {
  runLivingSpecCucumber,
  type LivingSpecTestRunSummary,
} from '../living-specs/cucumber-runner.js';
import {
  type ScenarioInput,
  routeLivingSpecFile,
  updateLivingSpecFile,
} from '../living-specs/gherkin.js';
import { writeStubStepDefinitions } from '../living-specs/step-stubs.js';
import { readWorkflowState, writeWorkflowState } from '../core/workflow-state.js';

/**
 * Phase of the TDD cycle within /spec-n-implement orchestration.
 */
export type ImplementPhase = 'entry' | 'green' | 'refactor' | 'complete';

/**
 * Reported TDD cycle position after a Cucumber run.
 */
export type TddPhase = 'red' | 'green' | 'refactor' | 'complete';

/**
 * Options controlling the /spec-n-implement step orchestration flow.
 */
export interface RunImplementOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Zero-padded numeric task spec id.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Natural-language feature description used for living spec domain routing.
   */
  featureDescription: string;
  /**
   * New scenarios to append to the routed living spec file.
   */
  scenariosToAdd?: ScenarioInput[];
  /**
   * Existing scenarios to replace by name in the routed living spec file.
   */
  scenariosToUpdate?: ScenarioInput[];
  /**
   * Scenario titles to remove from living spec files during this implementation.
   */
  deprecatedScenarioNames?: string[];
  /**
   * Implement orchestration phase; defaults to `entry` (living spec + red run).
   */
  phase?: ImplementPhase;
  /**
   * True when production code has been written for the current vertical slice.
   */
  productionCodeWritten?: boolean;
}

/**
 * Summary returned after /spec-n-implement orchestration.
 */
export interface ImplementResult {
  /**
   * Task spec id entering implementation.
   */
  taskSpecId: string;
  /**
   * Slug of the task spec directory.
   */
  slug: string;
  /**
   * True when a living spec file was created or modified.
   */
  livingSpecUpdated: boolean;
  /**
   * Inferred kebab-case living spec domain.
   */
  domain: string;
  /**
   * Project-relative path to the updated living spec feature file.
   */
  featureRelativePath: string;
  /**
   * Absolute path to the updated living spec feature file.
   */
  featureFilePath: string;
  /**
   * Current TDD cycle position after this invocation.
   */
  tddPhase: TddPhase;
  /**
   * Number of new stub step definitions generated during this invocation.
   */
  stubsGenerated: number;
  /**
   * Project-relative path to the stub step definitions file when generated.
   */
  stubStepDefinitionsPath?: string;
  /**
   * Cucumber run summary for the current task-tagged scenarios.
   */
  testRun: LivingSpecTestRunSummary;
}

/**
 * Error thrown when Cucumber reports all scenarios passing before production code exists.
 */
export class TddRedGateError extends Error {
  /**
   * Creates a red-gate error with the standard remediation message.
   *
   * @param testRun - Cucumber summary that triggered the gate.
   */
  constructor(testRun: LivingSpecTestRunSummary) {
    super(
      `TDD red gate: all ${testRun.totalCount} Cucumber scenario(s) passed before production code was written. ` +
        'Implementation must start with failing tests — update living spec scenarios or keep stub step definitions throwing until behavior is implemented.',
    );
    this.name = 'TddRedGateError';
  }
}

/**
 * Resolves the reported TDD phase from implement phase and Cucumber results.
 *
 * @param phase - Implement orchestration phase for this invocation.
 * @param testRun - Cucumber summary from the run.
 * @returns TDD phase label for developer reporting.
 */
function resolveTddPhase(phase: ImplementPhase, testRun: LivingSpecTestRunSummary): TddPhase {
  if (phase === 'complete') {
    return 'complete';
  }
  if (phase === 'refactor') {
    return testRun.success ? 'refactor' : 'red';
  }
  if (phase === 'green') {
    return testRun.success ? 'green' : 'red';
  }
  return testRun.success ? 'green' : 'red';
}

/**
 * Enforces the pre-code red gate when all tests pass before production code exists.
 *
 * @param testRun - Cucumber summary from the entry run.
 * @param productionCodeWritten - Whether production code has already been written.
 */
function enforcePreCodeRedGate(
  testRun: LivingSpecTestRunSummary,
  productionCodeWritten: boolean,
): void {
  if (productionCodeWritten) {
    return;
  }

  if (testRun.totalCount > 0 && testRun.success && testRun.failedCount === 0) {
    throw new TddRedGateError(testRun);
  }
}

/**
 * Verifies Cucumber reports all task-tagged scenarios passing.
 *
 * @param testRun - Cucumber summary to validate.
 * @param phaseLabel - Human-readable phase label for error messages.
 */
function assertAllScenariosPass(testRun: LivingSpecTestRunSummary, phaseLabel: string): void {
  if (testRun.totalCount === 0) {
    throw new Error(
      `${phaseLabel}: no scenarios matched @spec-n-roll tag — add living spec scenarios before completing implement.`,
    );
  }

  if (!testRun.success || testRun.failedCount > 0) {
    throw new Error(
      `${phaseLabel}: ${testRun.failedCount} of ${testRun.totalCount} scenario(s) still failing — keep implementing until all tests pass.`,
    );
  }
}

/**
 * Runs implement entry with living spec updates before any test or production code.
 *
 * Living spec Gherkin files remain agent-managed; this handler performs the
 * toolkit's first implement action by routing, tagging, and writing scenarios,
 * then runs the TDD red-green-refactor Cucumber cycle.
 *
 * @param options - Implement orchestration options.
 * @returns Summary of living spec updates and Cucumber TDD progress.
 */
export async function runImplement(options: RunImplementOptions): Promise<ImplementResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const { taskSpecId, slug, featureDescription } = options;
  const phase = options.phase ?? 'entry';
  const productionCodeWritten = options.productionCodeWritten ?? false;

  const existingState = await readWorkflowState(projectRoot, taskSpecId, slug);
  if (existingState == null) {
    throw new Error(`Workflow state is missing for task spec ${taskSpecId}-${slug}.`);
  }

  let livingSpecUpdated = false;
  let domain = '';
  let featureRelativePath = '';
  let featureFilePath = '';
  let stubsGenerated = 0;
  let stubStepDefinitionsPath: string | undefined;

  if (phase === 'entry') {
    const { route, livingSpecUpdated: updated } = await updateLivingSpecFile(
      projectRoot,
      featureDescription,
      taskSpecId,
      {
        scenariosToAdd: options.scenariosToAdd,
        scenariosToUpdate: options.scenariosToUpdate,
        deprecatedScenarioNames: options.deprecatedScenarioNames,
      },
    );

    livingSpecUpdated = updated;
    domain = route.domain;
    featureRelativePath = route.relativePath;
    featureFilePath = route.absolutePath;

    const stubResult = await writeStubStepDefinitions(projectRoot, {
      featureFilePaths: [featureFilePath],
    });
    stubsGenerated = stubResult.stubsGenerated;
    stubStepDefinitionsPath = path.relative(projectRoot, stubResult.stubFilePath);
  } else {
    const route = routeLivingSpecFile(projectRoot, featureDescription);
    domain = route.domain;
    featureRelativePath = route.relativePath;
    featureFilePath = route.absolutePath;
  }

  const testRun = await runLivingSpecCucumber({ projectRoot, taskSpecId });
  const tddPhase = resolveTddPhase(phase, testRun);

  if (phase === 'entry') {
    enforcePreCodeRedGate(testRun, productionCodeWritten);
    await writeWorkflowState(projectRoot, {
      taskSpecId,
      slug,
      workflowVariantId: existingState.workflowVariantId,
      lastCompletedStepId: existingState.lastCompletedStepId,
      currentStepId: 'implement',
      status: 'active',
    });
  }

  if (phase === 'green') {
    assertAllScenariosPass(testRun, 'TDD green');
  }

  if (phase === 'refactor') {
    assertAllScenariosPass(testRun, 'TDD refactor');
  }

  if (phase === 'complete') {
    assertAllScenariosPass(testRun, 'Implement complete');
    await writeWorkflowState(projectRoot, {
      taskSpecId,
      slug,
      workflowVariantId: existingState.workflowVariantId,
      lastCompletedStepId: 'implement',
      currentStepId: 'implement',
      status: 'complete',
    });
  }

  return {
    taskSpecId,
    slug,
    livingSpecUpdated,
    domain,
    featureRelativePath,
    featureFilePath,
    tddPhase,
    stubsGenerated,
    stubStepDefinitionsPath,
    testRun,
  };
}
