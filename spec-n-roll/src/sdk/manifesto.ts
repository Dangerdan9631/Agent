import path from 'node:path';

import fse from 'fs-extra';

import {
  GLOBAL_MANIFESTO_RELATIVE_PATH,
  readGlobalManifesto,
  readStepManifesto,
  stepManifestoDir,
} from './manifesto/index.js';

/**
 * One manifesto entry returned by the read-only manifesto show operation.
 */
export interface ManifestoShowEntry {
  /**
   * Whether the entry is project-global or scoped to a workflow step.
   */
  scope: 'global' | 'step';
  /**
   * Workflow step id when `scope` is `step`.
   */
  stepId?: string;
  /**
   * Project-relative path to the manifesto file.
   */
  path: string;
  /**
   * Raw markdown body when the file exists; null when absent.
   */
  content: string | null;
}

/**
 * Loads manifesto content for read-only show operations.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param options - Scope selector flags from the invocation.
 * @returns Manifesto entries matching the requested scope.
 */
export async function loadManifestoShowEntries(
  projectRoot: string,
  options: { global?: boolean; step?: string },
): Promise<ManifestoShowEntry[]> {
  if (options.global === true) {
    return [
      {
        scope: 'global',
        path: GLOBAL_MANIFESTO_RELATIVE_PATH,
        content: await readGlobalManifesto(projectRoot),
      },
    ];
  }

  if (options.step != null) {
    return [
      {
        scope: 'step',
        stepId: options.step,
        path: path.posix.join('.spec-n-roll/config/manifesto/steps', `${options.step}.md`),
        content: await readStepManifesto(projectRoot, options.step),
      },
    ];
  }

  const entries: ManifestoShowEntry[] = [
    {
      scope: 'global',
      path: GLOBAL_MANIFESTO_RELATIVE_PATH,
      content: await readGlobalManifesto(projectRoot),
    },
  ];

  const stepsDir = stepManifestoDir(projectRoot);
  if (await fse.pathExists(stepsDir)) {
    const files = (await fse.readdir(stepsDir)).filter((entry) => entry.endsWith('.md')).sort();
    for (const fileName of files) {
      const stepId = fileName.slice(0, -'.md'.length);
      entries.push({
        scope: 'step',
        stepId,
        path: path.posix.join('.spec-n-roll/config/manifesto/steps', fileName),
        content: await readStepManifesto(projectRoot, stepId),
      });
    }
  }

  return entries;
}
