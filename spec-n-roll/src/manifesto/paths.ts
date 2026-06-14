import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';

/**
 * Project-relative path to the global manifesto file under config.
 */
export const GLOBAL_MANIFESTO_RELATIVE_PATH = '.spec-n-roll/config/manifesto/global.md';

/**
 * Project-relative path to the manifesto config directory.
 */
export const MANIFESTO_CONFIG_RELATIVE_DIR = '.spec-n-roll/config/manifesto';

/**
 * Subdirectory name for step-scoped manifesto files.
 */
export const MANIFESTO_STEPS_SUBDIR = 'steps';

/**
 * Toolkit template filenames copied during project init.
 */
export const MANIFESTO_TEMPLATE_FILES = {
  global: 'manifesto-global.md',
  step: 'manifesto-step.md',
} as const;

/**
 * Resolves the absolute path to the manifesto config directory for a project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Absolute path to `.spec-n-roll/config/manifesto`.
 */
export function manifestoConfigDir(projectRoot: string): string {
  return path.join(projectRoot, MANIFESTO_CONFIG_RELATIVE_DIR);
}

/**
 * Resolves the absolute path to the global manifesto file for a project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Absolute path to `global.md`.
 */
export function globalManifestoPath(projectRoot: string): string {
  return path.join(projectRoot, GLOBAL_MANIFESTO_RELATIVE_PATH);
}

/**
 * Resolves the absolute path to the step manifesto directory for a project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Absolute path to `.spec-n-roll/config/manifesto/steps`.
 */
export function stepManifestoDir(projectRoot: string): string {
  return path.join(manifestoConfigDir(projectRoot), MANIFESTO_STEPS_SUBDIR);
}

/**
 * Resolves the absolute path to a step-scoped manifesto file.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param stepId - Kebab-case workflow step id used as the filename stem.
 * @returns Absolute path to `steps/{stepId}.md`.
 */
export function stepManifestoPath(projectRoot: string, stepId: string): string {
  return path.join(stepManifestoDir(projectRoot), `${stepId}.md`);
}

/**
 * Resolves the absolute path to a bundled manifesto init template file.
 *
 * @param templateFile - Toolkit template filename such as `manifesto-global.md`.
 * @returns Absolute path to the template in `dist/templates` or `src/templates`.
 */
export function resolveManifestoTemplatePath(templateFile: string): string {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const distPath = path.join(packageRoot, 'dist', 'templates', templateFile);
  const srcPath = path.join(packageRoot, 'src', 'templates', templateFile);
  return fse.pathExistsSync(distPath) ? distPath : srcPath;
}
