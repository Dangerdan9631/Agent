import path from 'node:path';
import fse from 'fs-extra';

import { taskSpecFilePath } from '../core/paths.js';
import { workflowConfigSchema, type WorkflowConfig } from '../config/schema.js';
import {
  REPOSITORY_WORKFLOW_REPORT_FILENAME,
  repositoryWorkflowReportRelativePath,
} from '../repository/report.js';
import type { WorkflowState } from './state.js';
import {
  getExpectedOutputsForVariant,
  getStepOutputs,
  getVariantStepIds,
} from './step-manifest.js';

/**
 * Relative path to the workflow configuration file from the project root.
 */
export const WORKFLOW_CONFIG_RELATIVE_PATH = '.spec-n-roll/config/workflow.config.json';

/**
 * Represents a partially completed artifact from a workflow step.
 */
export interface PartialArtifact {
  /** Workflow step id that produced the partial artifact. */
  stepId: string;
  /** Project-relative path to the partial artifact. */
  relativePath: string;
  /** Absolute path to the partial artifact on disk. */
  absolutePath: string;
}

/**
 * Result of artifact detection containing variant information and partial artifacts.
 */
export interface ArtifactDetectionResult {
  /** Active workflow variant id used for tier-aware expectations. */
  variantId: string;
  /** Ordered step ids for the resolved workflow variant. */
  variantSteps: string[];
  /** Partial artifacts detected for incomplete steps. */
  partialArtifacts: PartialArtifact[];
}

/**
 * Reads the workflow configuration file when present.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Parsed workflow configuration or null when absent.
 */
export async function readWorkflowConfig(projectRoot: string): Promise<WorkflowConfig | null> {
  const filePath = path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const raw: unknown = await fse.readJson(filePath);
  return workflowConfigSchema.parse(raw);
}

/**
 * Checks whether an absolute path exists on disk.
 *
 * @param absolutePath - Absolute path to test.
 * @returns True when the path exists.
 */
async function pathExists(absolutePath: string): Promise<boolean> {
  return fse.pathExists(absolutePath);
}

/**
 * Resolves whether a workflow output exists and returns its absolute path.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecDirPath - Absolute path to the task spec directory.
 * @param outputPath - Output path relative to the task spec dir or project root when trailing `/`.
 * @returns Existence flag and resolved absolute path.
 */
async function resolveOutputExists(
  projectRoot: string,
  taskSpecDirPath: string,
  outputPath: string,
): Promise<{ exists: boolean; absolutePath: string }> {
  const absolutePath = outputPath.endsWith('/')
    ? path.join(projectRoot, outputPath)
    : path.join(taskSpecDirPath, outputPath);
  const exists = outputPath.endsWith('/')
    ? (await fse.pathExists(absolutePath)) && (await fse.readdir(absolutePath)).length > 0
    : await pathExists(absolutePath);

  return { exists, absolutePath };
}

/**
 * Resolves ordered step ids for a workflow variant from config or built-in defaults.
 *
 * @param workflowVariantId - Workflow variant id such as `quick`.
 * @param workflowConfig - Optional workflow configuration.
 * @returns Ordered step ids for the variant.
 */
function resolveVariantSteps(
  workflowVariantId: string,
  workflowConfig: WorkflowConfig | null,
): string[] {
  const configured = workflowConfig?.workflows.find((w) => w.id === workflowVariantId)?.steps;
  return getVariantStepIds(workflowVariantId, configured);
}

/**
 * Returns true when every expected output path for a step exists on disk.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecDirPath - Absolute path to the task spec directory.
 * @param stepId - Workflow step id to evaluate.
 * @param variantId - Workflow variant id for tier-specific outputs.
 * @returns True when all manifest outputs for the step are present.
 */
export async function stepOutputsExist(
  projectRoot: string,
  taskSpecDirPath: string,
  stepId: string,
  variantId: string,
): Promise<boolean> {
  const outputs = getStepOutputs(stepId, variantId);
  if (outputs.length === 0) {
    return false;
  }

  for (const outputPath of outputs) {
    const { exists } = await resolveOutputExists(projectRoot, taskSpecDirPath, outputPath);
    if (!exists) {
      return false;
    }
  }

  return true;
}

/**
 * Infers the last completed tier step from on-disk artifacts when workflow state is absent.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecDirPath - Absolute path to the task spec directory.
 * @param variantId - Workflow variant id for tier-aware expectations.
 * @param variantSteps - Optional configured steps for the variant.
 * @returns Last step id whose outputs all exist, or null when none are complete.
 */
export async function inferLastCompletedStepFromArtifacts(
  projectRoot: string,
  taskSpecDirPath: string,
  variantId: string,
  variantSteps?: readonly string[],
): Promise<string | null> {
  const steps = getVariantStepIds(variantId, variantSteps);
  let lastComplete: string | null = null;

  for (const stepId of steps) {
    const complete = await stepOutputsExist(projectRoot, taskSpecDirPath, stepId, variantId);
    if (!complete) {
      break;
    }
    lastComplete = stepId;
  }

  return lastComplete;
}

/**
 * Detects partially completed artifacts using workflow state and tier-aware expectations.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecDirPath - Absolute path to the task spec directory.
 * @param state - Current workflow state or null when not started.
 * @param workflowConfig - Optional workflow configuration override.
 * @returns Variant metadata and any detected partial artifacts.
 */
export async function detectPartialArtifacts(
  projectRoot: string,
  taskSpecDirPath: string,
  state: WorkflowState | null,
  workflowConfig?: WorkflowConfig | null,
): Promise<ArtifactDetectionResult> {
  const config = workflowConfig ?? (await readWorkflowConfig(projectRoot));
  const variantId = state?.workflowVariantId ?? config?.defaultWorkflowId ?? 'quick';
  const variantSteps = resolveVariantSteps(variantId, config);
  const expectedOutputs = getExpectedOutputsForVariant(
    variantId,
    config?.workflows.find((w) => w.id === variantId)?.steps,
  );

  const lastCompleted = state?.lastCompletedStepId ?? null;
  const partialArtifacts: PartialArtifact[] = [];

  for (const stepId of variantSteps) {
    if (lastCompleted != null) {
      const lastIndex = variantSteps.indexOf(lastCompleted);
      const stepIndex = variantSteps.indexOf(stepId);
      if (lastIndex >= 0 && stepIndex <= lastIndex) {
        continue;
      }
    }

    const outputs = expectedOutputs.get(stepId) ?? [];
    for (const outputPath of outputs) {
      const { exists, absolutePath } = await resolveOutputExists(
        projectRoot,
        taskSpecDirPath,
        outputPath,
      );
      if (exists) {
        partialArtifacts.push({
          stepId,
          relativePath: outputPath,
          absolutePath,
        });
      }
    }
  }

  return {
    variantId,
    variantSteps,
    partialArtifacts,
  };
}

/**
 * Builds the project-relative path to a repository workflow report artifact.
 *
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Project-relative report path under the task spec directory.
 */
export function repositoryWorkflowReportPath(taskSpecId: string, slug: string): string {
  return repositoryWorkflowReportRelativePath(taskSpecId, slug);
}

/**
 * Resolves the absolute path to a repository workflow report artifact.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Absolute path to the repository workflow report file.
 */
export function repositoryWorkflowReportAbsolutePath(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): string {
  return taskSpecFilePath(projectRoot, taskSpecId, slug, REPOSITORY_WORKFLOW_REPORT_FILENAME);
}

/**
 * Checks whether a repository workflow report artifact exists for a task spec.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns True when the report file exists on disk.
 */
export async function repositoryWorkflowReportExists(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<boolean> {
  const absolutePath = repositoryWorkflowReportAbsolutePath(projectRoot, taskSpecId, slug);
  return fse.pathExists(absolutePath);
}
