import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';

import { applyInitialSpecFrontmatter } from './frontmatter.js';
import { CoreMutationError } from './errors.js';
import { assertTaskSpecWritable } from './task-lifecycle.js';
import { findToolkitPackageRoot, taskSpecDir } from './paths.js';

/**
 * Maps workflow step ids to toolkit template filenames under `src/templates/`.
 */
const STEP_TEMPLATE_FILES: Record<string, string> = {
  specify: 'spec.md',
  plan: 'plan.md',
  tasks: 'tasks.md',
};

/**
 * Resolves the absolute path to a step output template file.
 *
 * @param stepId - Workflow step id such as `specify`, `plan`, or `tasks`.
 * @returns Absolute path to the template source file.
 */
export function resolveTemplatePath(stepId: string): string {
  const templateFile = STEP_TEMPLATE_FILES[stepId];
  if (templateFile == null) {
    throw new CoreMutationError(
      'UNKNOWN_STEP_TEMPLATE',
      `No toolkit template is registered for step id "${stepId}".`,
      'Use specify, plan, or tasks for built-in step output templates.',
    );
  }

  const packageRoot = findToolkitPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
  const distPath = path.join(packageRoot, 'dist', 'templates', templateFile);
  const srcPath = path.join(packageRoot, 'src', 'sdk', 'templates', templateFile);
  return fse.pathExistsSync(distPath) ? distPath : srcPath;
}

/**
 * Options for instantiating a step output template into a task spec directory.
 */
export interface InstantiateStepOutputOptions {
  /** Optional frontmatter values applied when instantiating `spec.md`. */
  frontmatter?: Record<string, unknown>;
}

/**
 * Copies a toolkit step output template into the task spec directory.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param stepId - Workflow step id determining which template to copy.
 * @param options - Optional frontmatter values for `spec.md` instantiation.
 * @returns Project-relative path to the instantiated artifact.
 */
export async function instantiateStepOutput(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  stepId: string,
  options: InstantiateStepOutputOptions = {},
): Promise<string> {
  const templatePath = resolveTemplatePath(stepId);
  if (!(await fse.pathExists(templatePath))) {
    throw new CoreMutationError(
      'TEMPLATE_MISSING',
      `Toolkit template for step "${stepId}" was not found at ${templatePath}.`,
      'Re-run toolkit build or update to restore template files.',
    );
  }

  await assertTaskSpecWritable(projectRoot, taskSpecId, slug);

  const targetDir = taskSpecDir(projectRoot, taskSpecId, slug);
  await fse.ensureDir(targetDir);

  const targetFilename = STEP_TEMPLATE_FILES[stepId];
  const targetPath = path.join(targetDir, targetFilename);
  await fse.copy(templatePath, targetPath, { overwrite: true });

  if (stepId === 'specify' && options.frontmatter != null) {
    await applyInitialSpecFrontmatter(projectRoot, taskSpecId, slug, options.frontmatter);
  }

  return path.posix.join('specs', `${taskSpecId}-${slug}`, targetFilename);
}
