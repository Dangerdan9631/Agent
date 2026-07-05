import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import { runCucumber } from '@cucumber/cucumber/api';
import type { Envelope } from '@cucumber/messages';
import { TestStepResultStatus } from '@cucumber/messages';

import { STEP_DEFINITIONS_DIR } from './step-stubs.js';

/**
 * Status for a single Cucumber scenario after a test run.
 */
export type ScenarioRunStatus = 'passed' | 'failed' | 'skipped' | 'pending';

/**
 * Per-scenario Cucumber result collected during a run.
 */
export interface ScenarioTestStatus {
  /**
   * Scenario title from the living spec feature file.
   */
  name: string;
  /**
   * URI of the feature file containing the scenario.
   */
  uri: string;
  /**
   * Final scenario status after the run.
   */
  status: ScenarioRunStatus;
}

/**
 * Summary of a living-spec Cucumber test run for TDD progress reporting.
 */
export interface LivingSpecTestRunSummary {
  /**
   * True when Cucumber reports an overall successful run.
   */
  success: boolean;
  /**
   * Per-scenario pass/fail results.
   */
  scenarios: ScenarioTestStatus[];
  /**
   * Count of scenarios that passed.
   */
  passedCount: number;
  /**
   * Count of scenarios that failed.
   */
  failedCount: number;
  /**
   * Total scenarios executed.
   */
  totalCount: number;
  /**
   * Human-readable progress message for the current TDD phase.
   */
  progressMessage: string;
}

/**
 * Options for running Cucumber against living spec feature files.
 */
export interface RunLivingSpecCucumberOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Zero-padded task spec id used to filter tagged scenarios.
   */
  taskSpecId: string;
  /**
   * Optional tag expression override; defaults to `@spec-n-roll-{taskSpecId}`.
   */
  tagExpression?: string;
}

/**
 * Tracks per-scenario pass/fail state from Cucumber message envelopes.
 */
export class TestStatusTracker {
  private readonly pickleNames = new Map<string, string>();
  private readonly pickleUris = new Map<string, string>();
  private readonly testCaseToPickle = new Map<string, string>();
  private readonly startedToPickle = new Map<string, string>();
  private readonly failedRuns = new Set<string>();
  private readonly skippedRuns = new Set<string>();
  private readonly results = new Map<string, ScenarioTestStatus>();

  /**
   * Consumes a Cucumber message envelope to update scenario tracking.
   *
   * @param envelope - Message emitted during a Cucumber run.
   */
  handleMessage(envelope: Envelope): void {
    if (envelope.pickle != null) {
      this.pickleNames.set(envelope.pickle.id, envelope.pickle.name);
      this.pickleUris.set(envelope.pickle.id, envelope.pickle.uri);
    }

    if (envelope.testCase != null) {
      this.testCaseToPickle.set(envelope.testCase.id, envelope.testCase.pickleId);
    }

    if (envelope.testCaseStarted != null) {
      const pickleId = this.testCaseToPickle.get(envelope.testCaseStarted.testCaseId);
      if (pickleId != null) {
        this.startedToPickle.set(envelope.testCaseStarted.id, pickleId);
      }
    }

    if (envelope.testStepFinished != null) {
      const status = envelope.testStepFinished.testStepResult.status;
      if (
        status === TestStepResultStatus.FAILED ||
        status === TestStepResultStatus.AMBIGUOUS ||
        status === TestStepResultStatus.UNDEFINED
      ) {
        this.failedRuns.add(envelope.testStepFinished.testCaseStartedId);
      }
      if (status === TestStepResultStatus.SKIPPED) {
        this.skippedRuns.add(envelope.testStepFinished.testCaseStartedId);
      }
    }

    if (envelope.testCaseFinished != null) {
      const pickleId = this.startedToPickle.get(envelope.testCaseFinished.testCaseStartedId);
      if (pickleId == null) {
        return;
      }

      let status: ScenarioRunStatus = 'passed';
      if (this.failedRuns.has(envelope.testCaseFinished.testCaseStartedId)) {
        status = 'failed';
      } else if (this.skippedRuns.has(envelope.testCaseFinished.testCaseStartedId)) {
        status = 'skipped';
      }

      this.results.set(pickleId, {
        name: this.pickleNames.get(pickleId) ?? 'unknown',
        uri: this.pickleUris.get(pickleId) ?? '',
        status,
      });
    }
  }

  /**
   * Returns tracked scenario results in encounter order.
   *
   * @returns Scenario pass/fail records collected during the run.
   */
  getScenarios(): ScenarioTestStatus[] {
    return [...this.results.values()];
  }
}

/**
 * Builds a developer-facing TDD progress message from a test run summary.
 *
 * @param success - Whether Cucumber reported overall success.
 * @param passedCount - Number of passing scenarios.
 * @param failedCount - Number of failing scenarios.
 * @param totalCount - Total scenarios executed.
 * @returns Progress message describing the current TDD state.
 */
export function buildTddProgressMessage(
  success: boolean,
  passedCount: number,
  failedCount: number,
  totalCount: number,
): string {
  if (totalCount === 0) {
    return 'TDD red: no scenarios matched the task tag filter — add tagged living spec scenarios.';
  }

  if (!success || failedCount > 0) {
    return `TDD red: ${failedCount} of ${totalCount} scenario(s) failing — implement behavior to reach green.`;
  }

  return `TDD green: all ${passedCount} scenario(s) passing — refactor while keeping tests green.`;
}

/**
 * Ensures the project can resolve `@cucumber/cucumber` for generated stub imports.
 *
 * @param projectRoot - Absolute path to the project root.
 */
async function ensureCucumberResolvable(projectRoot: string): Promise<void> {
  const root = path.resolve(projectRoot);
  const projectCucumber = path.join(root, 'node_modules', '@cucumber', 'cucumber', 'package.json');
  if (await fse.pathExists(projectCucumber)) {
    return;
  }

  const toolkitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const toolkitNodeModules = path.join(toolkitRoot, 'node_modules');
  const toolkitCucumber = path.join(toolkitNodeModules, '@cucumber', 'cucumber', 'package.json');
  if (!(await fse.pathExists(toolkitCucumber))) {
    throw new Error(
      'Cucumber is not installed in this project. Add @cucumber/cucumber to run living-spec tests.',
    );
  }

  const packageJsonPath = path.join(root, 'package.json');
  if (!(await fse.pathExists(packageJsonPath))) {
    await fse.writeFile(packageJsonPath, '{"type":"module"}\n', 'utf8');
  }

  const linkTarget = path.join(root, 'node_modules');
  if (await fse.pathExists(linkTarget)) {
    return;
  }

  await fse.ensureDir(root);
  await fse.symlink(toolkitNodeModules, linkTarget, 'junction');
}

/**
 * Runs Cucumber against living spec `.feature` files with project step definitions.
 *
 * @param options - Project root and task tag filter for the run.
 * @returns Structured pass/fail summary for TDD progress reporting.
 */
export async function runLivingSpecCucumber(
  options: RunLivingSpecCucumberOptions,
): Promise<LivingSpecTestRunSummary> {
  const projectRoot = path.resolve(options.projectRoot);
  await ensureCucumberResolvable(projectRoot);

  const tagExpression = options.tagExpression ?? `@spec-n-roll-${options.taskSpecId}`;
  const tracker = new TestStatusTracker();

  const result = await runCucumber(
    {
      sources: {
        paths: ['living-specs/**/*.feature'],
        defaultDialect: 'en',
        names: [],
        tagExpression,
        order: 'defined',
      },
      support: {
        importPaths: [
          `${STEP_DEFINITIONS_DIR}/**/*.mjs`,
          `${STEP_DEFINITIONS_DIR}/**/*.js`,
          `${STEP_DEFINITIONS_DIR}/**/*.cjs`,
        ],
      },
      runtime: {
        dryRun: false,
        failFast: false,
        filterStacktraces: true,
        parallel: 0,
        retry: 0,
        retryTagFilter: '',
        strict: true,
        worldParameters: {},
      },
      formats: {
        stdout: 'progress',
        files: {},
        publish: false,
        options: {},
      },
    },
    { cwd: projectRoot },
    (envelope) => {
      tracker.handleMessage(envelope);
    },
  );

  const scenarios = tracker.getScenarios();
  const passedCount = scenarios.filter((scenario) => scenario.status === 'passed').length;
  const failedCount = scenarios.filter((scenario) => scenario.status === 'failed').length;
  const totalCount = scenarios.length;

  return {
    success: result.success,
    scenarios,
    passedCount,
    failedCount,
    totalCount,
    progressMessage: buildTddProgressMessage(result.success, passedCount, failedCount, totalCount),
  };
}
