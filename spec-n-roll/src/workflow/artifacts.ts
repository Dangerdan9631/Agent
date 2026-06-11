import path from 'node:path';
import fse from 'fs-extra';

import { workflowConfigSchema, type WorkflowConfig } from '../config/schema.js';
import {
  atomicWriteJson,
  formatTaskSpecId,
  projectMetadataSchema,
  type ProjectMetadata,
  type WorkflowState,
} from './state.js';
import { getExpectedOutputsForVariant, getVariantStepIds } from './step-manifest.js';

/**
 * Schema version for project metadata to enable future migrations.
 */
export const PROJECT_METADATA_SCHEMA_VERSION = '1';

/**
 * Relative path to the project metadata file.
 */
export const PROJECT_METADATA_RELATIVE_PATH = '.spec-n-roll/config/project-metadata.json';

/**
 * Relative path to the workflow configuration file.
 */
export const WORKFLOW_CONFIG_RELATIVE_PATH = '.spec-n-roll/config/workflow.config.json';

/**
 * Returns the absolute path to the project metadata file for a project.
 *
 * @param projectRoot - Absolute path to the project root. Must be a valid directory.
 * @returns Absolute path to the project metadata file.
 */
export function projectMetadataPath(projectRoot: string): string {
  return path.join(projectRoot, PROJECT_METADATA_RELATIVE_PATH);
}

/**
 * Reads the project metadata file to retrieve task spec tracking information.
 *
 * @param projectRoot - Absolute path to the project root. Must be a valid directory.
 * @returns Project metadata object or null if the file does not exist.
 */
export async function readProjectMetadata(projectRoot: string): Promise<ProjectMetadata | null> {
  const filePath = projectMetadataPath(projectRoot);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const raw: unknown = await fse.readJson(filePath);
  return projectMetadataSchema.parse(raw);
}

/**
 * Writes the project metadata file to update task spec tracking information.
 *
 * @param projectRoot - Absolute path to the project root. Must be a valid directory.
 * @param metadata - The metadata to write, optionally without updatedAt.
 * @returns The complete ProjectMetadata object with updatedAt set.
 */
export async function writeProjectMetadata(
  projectRoot: string,
  metadata: Omit<ProjectMetadata, 'updatedAt'> & { updatedAt?: string },
): Promise<ProjectMetadata> {
  const filePath = projectMetadataPath(projectRoot);
  const payload: ProjectMetadata = projectMetadataSchema.parse({
    ...metadata,
    updatedAt: metadata.updatedAt ?? new Date().toISOString(),
  });

  await atomicWriteJson(filePath, payload);
  return payload;
}

/**
 * Allocates the next task spec ID and updates the project metadata to
 * ensure sequential task spec numbering.
 *
 * @param projectRoot - Absolute path to the project root. Must be a valid directory.
 * @returns Object containing the allocated task spec ID and updated metadata.
 */
export async function allocateNextTaskSpecId(projectRoot: string): Promise<{
  taskSpecId: string;
  metadata: ProjectMetadata;
}> {
  const existing = await readProjectMetadata(projectRoot);
  const nextId = existing?.nextTaskSpecId ?? 1;
  const taskSpecId = formatTaskSpecId(nextId);

  const metadata = await writeProjectMetadata(projectRoot, {
    schemaVersion: existing?.schemaVersion ?? PROJECT_METADATA_SCHEMA_VERSION,
    nextTaskSpecId: nextId + 1,
    currentTaskSpecId: existing?.currentTaskSpecId ?? null,
    currentTaskSlug: existing?.currentTaskSlug ?? null,
    implementationStartedAt: existing?.implementationStartedAt ?? null,
  });

  return { taskSpecId, metadata };
}

/**
 * Reads the workflow configuration file to retrieve workflow step and tier settings.
 *
 * @param projectRoot - Absolute path to the project root. Must be a valid directory.
 * @returns Workflow configuration object or null if the file does not exist.
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
 * Represents a partially completed artifact from a workflow step.
 */
export interface PartialArtifact {
  stepId: string;
  relativePath: string;
  absolutePath: string;
}

/**
 * Result of artifact detection containing variant information and
 * any partially completed artifacts.
 */
export interface ArtifactDetectionResult {
  variantId: string;
  variantSteps: string[];
  partialArtifacts: PartialArtifact[];
}

/**
 * Checks if a path exists to avoid attempting operations on non-existent files.
 *
 * @param absolutePath - Absolute path to check. Must be a valid path.
 * @returns true if the path exists, false otherwise.
 */
async function pathExists(absolutePath: string): Promise<boolean> {
  return fse.pathExists(absolutePath);
}

/**
 * Resolves whether a workflow output exists and returns its absolute path
 * to support both file and directory outputs.
 *
 * @param projectRoot - Absolute path to the project root. Must be a valid directory.
 * @param taskSpecDir - Directory containing the task spec outputs.
 * @param outputPath - Relative or absolute output path to check.
 * @returns Object with existence flag and resolved absolute path.
 */
async function resolveOutputExists(
  projectRoot: string,
  taskSpecDir: string,
  outputPath: string,
): Promise<{ exists: boolean; absolutePath: string }> {
  const absolutePath = outputPath.endsWith('/')
    ? path.join(projectRoot, outputPath)
    : path.join(taskSpecDir, outputPath);
  const exists = outputPath.endsWith('/')
    ? (await fse.pathExists(absolutePath)) && (await fse.readdir(absolutePath)).length > 0
    : await pathExists(absolutePath);

  return { exists, absolutePath };
}

/**
 * Resolves the step IDs for a workflow variant from configuration or defaults.
 *
 * @param workflowVariantId - The workflow variant ID to resolve steps for.
 * @param workflowConfig - The workflow configuration or null to use defaults.
 * @returns Array of step IDs for the variant.
 */
function resolveVariantSteps(
  workflowVariantId: string,
  workflowConfig: WorkflowConfig | null,
): string[] {
  const configured = workflowConfig?.workflows.find((w) => w.id === workflowVariantId)?.steps;
  return getVariantStepIds(workflowVariantId, configured);
}

/**
 * Detects partially completed artifacts in a task spec directory to
 * identify work that can be resumed after interruption.
 *
 * @param projectRoot - Absolute path to the project root. Must be a valid directory.
 * @param taskSpecDir - Directory containing the task spec outputs.
 * @param state - Current workflow state or null if not started.
 * @param workflowConfig - Optional workflow configuration to use for detection.
 * @returns Artifact detection result with variant info and partial artifacts.
 */
export async function detectPartialArtifacts(
  projectRoot: string,
  taskSpecDir: string,
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
        taskSpecDir,
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
