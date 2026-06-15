import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteText } from '../core/atomic-write.js';
import {
  GLOBAL_MANIFESTO_RELATIVE_PATH,
  globalManifestoPath,
  stepManifestoDir,
  stepManifestoPath,
} from './paths.js';
import { CONSTITUTION_RELATIVE_PATH, validateManifestoDraft } from './validation.js';

/**
 * One manifesto entry loaded for a workflow step with explicit scope labeling.
 */
export interface ManifestoEntry {
  /**
   * Whether the entry is project-global or scoped to a single workflow step.
   */
  scope: 'global' | 'step';
  /**
   * Workflow step id when `scope` is `step`; omitted for global entries.
   */
  stepId?: string;
  /**
   * Project-relative path to the manifesto file on disk.
   */
  path: string;
  /**
   * Raw markdown body loaded from the manifesto file.
   */
  content: string;
}

export {
  GLOBAL_MANIFESTO_RELATIVE_PATH,
  MANIFESTO_CONFIG_RELATIVE_DIR,
  MANIFESTO_STEPS_SUBDIR,
  MANIFESTO_TEMPLATE_FILES,
  globalManifestoPath,
  manifestoConfigDir,
  resolveManifestoTemplatePath,
  stepManifestoDir,
  stepManifestoPath,
} from './paths.js';

export {
  CONSTITUTION_RELATIVE_PATH,
  detectManifestoConstitutionConflicts,
  validateManifestoContent,
  validateManifestoDraft,
  type ManifestoValidationResult,
  type ValidateManifestoDraftOptions,
} from './validation.js';

/**
 * Reads the global manifesto file when present.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Raw markdown content or null when the file is absent.
 */
export async function readGlobalManifesto(projectRoot: string): Promise<string | null> {
  const filePath = globalManifestoPath(projectRoot);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  return fse.readFile(filePath, 'utf8');
}

/**
 * Reads the project constitution file when present.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Raw constitution markdown or null when the file is absent.
 */
export async function readConstitutionContent(projectRoot: string): Promise<string | null> {
  const filePath = path.join(projectRoot, CONSTITUTION_RELATIVE_PATH);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  return fse.readFile(filePath, 'utf8');
}

/**
 * Lists step-scoped manifesto files present on disk regardless of workflow registration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Step ids inferred from filenames under `manifesto/steps/`.
 */
export async function listStepManifestoIds(projectRoot: string): Promise<string[]> {
  const stepsDir = stepManifestoDir(projectRoot);
  if (!(await fse.pathExists(stepsDir))) {
    return [];
  }

  const entries = await fse.readdir(stepsDir);
  return entries
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => entry.slice(0, -'.md'.length))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Writes the global manifesto file atomically after validation.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param content - Raw markdown body to persist.
 */
export async function writeGlobalManifesto(projectRoot: string, content: string): Promise<void> {
  const constitutionContent = await readConstitutionContent(projectRoot);
  const validation = validateManifestoDraft(content, 'global', { constitutionContent });
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  await atomicWriteText(globalManifestoPath(projectRoot), content);
}

/**
 * Reads a step-scoped manifesto file when present.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param stepId - Kebab-case workflow step id used as the filename stem.
 * @returns Raw markdown content or null when the file is absent.
 */
export async function readStepManifesto(
  projectRoot: string,
  stepId: string,
): Promise<string | null> {
  const filePath = stepManifestoPath(projectRoot, stepId);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  return fse.readFile(filePath, 'utf8');
}

/**
 * Writes a step-scoped manifesto file atomically after validation.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param stepId - Kebab-case workflow step id used as the filename stem.
 * @param content - Raw markdown body to persist.
 */
export async function writeStepManifesto(
  projectRoot: string,
  stepId: string,
  content: string,
): Promise<void> {
  const constitutionContent = await readConstitutionContent(projectRoot);
  const validation = validateManifestoDraft(content, 'step', { constitutionContent });
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  await atomicWriteText(stepManifestoPath(projectRoot, stepId), content);
}

/**
 * Reads global and step-scoped manifestos applicable to a workflow step.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param stepId - Active workflow step id used to select a step manifesto file.
 * @returns Scope-labeled manifesto entries for inclusion in step init results.
 */
export async function readManifestosForStep(
  projectRoot: string,
  stepId: string,
): Promise<ManifestoEntry[]> {
  const entries: ManifestoEntry[] = [];

  const globalContent = await readGlobalManifesto(projectRoot);
  if (globalContent != null && globalContent.trim().length > 0) {
    entries.push({
      scope: 'global',
      path: GLOBAL_MANIFESTO_RELATIVE_PATH,
      content: globalContent,
    });
  }

  const stepContent = await readStepManifesto(projectRoot, stepId);
  if (stepContent != null) {
    entries.push({
      scope: 'step',
      stepId,
      path: path.posix.join('.spec-n-roll/config/manifesto/steps', `${stepId}.md`),
      content: stepContent,
    });
  }

  return entries;
}
