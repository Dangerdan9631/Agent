import path from 'node:path';

import {
  GLOBAL_MANIFESTO_RELATIVE_PATH,
  listStepManifestoIds,
  readGlobalManifesto,
  readStepManifesto,
} from '../../sdk/manifesto/index.js';
import { resolveRegisteredWorkflowStepIds } from '../../sdk/workflow/step-manifest.js';

/**
 * Read-model view of one manifesto file on disk.
 */
export interface ManifestoFileView {
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
  /**
   * True when the manifesto file exists on disk.
   */
  exists: boolean;
  /**
   * True when a step manifesto file has no matching registered workflow step.
   */
  orphan?: boolean;
}

/**
 * Aggregated manifesto read-model for the Ink manifesto view screen.
 */
export interface ManifestoView {
  /**
   * Global manifesto summary for display.
   */
  global: ManifestoFileView;
  /**
   * Step-scoped manifesto files discovered under `manifesto/steps/`.
   */
  stepManifestos: readonly ManifestoFileView[];
}

/**
 * Injectable dependencies for manifesto read-model tests.
 */
export interface LoadManifestoViewDeps {
  /**
   * Optional registered workflow step id resolver override.
   */
  resolveRegisteredWorkflowStepIds?: typeof resolveRegisteredWorkflowStepIds;
  /**
   * Optional step manifesto id lister override.
   */
  listStepManifestoIds?: typeof listStepManifestoIds;
}

/**
 * Builds one manifesto file view from loaded content.
 *
 * @param scope - Manifesto scope for the file.
 * @param relativePath - Project-relative manifesto path.
 * @param content - Loaded markdown body or null when absent.
 * @param stepId - Workflow step id when `scope` is `step`.
 * @param orphan - Whether the step file is orphaned from workflow registration.
 * @returns Manifesto file view for Ink display.
 */
function buildManifestoFileView(
  scope: 'global' | 'step',
  relativePath: string,
  content: string | null,
  stepId?: string,
  orphan?: boolean,
): ManifestoFileView {
  return {
    scope,
    stepId,
    path: relativePath,
    content,
    exists: content != null,
    ...(orphan === true ? { orphan: true } : {}),
  };
}

/**
 * Loads global and step manifesto content for the Ink read-only view screen.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param deps - Optional dependency overrides for tests.
 * @returns Manifesto view with global and step-scoped entries.
 */
export async function loadManifestoView(
  projectRoot: string,
  deps: LoadManifestoViewDeps = {},
): Promise<ManifestoView> {
  const listStepIds = deps.listStepManifestoIds ?? listStepManifestoIds;
  const resolveStepIds = deps.resolveRegisteredWorkflowStepIds ?? resolveRegisteredWorkflowStepIds;

  const globalContent = await readGlobalManifesto(projectRoot);
  const registeredStepIds = await resolveStepIds(projectRoot);
  const stepIds = await listStepIds(projectRoot);

  const stepManifestos = await Promise.all(
    stepIds.map(async (stepId) => {
      const content = await readStepManifesto(projectRoot, stepId);
      return buildManifestoFileView(
        'step',
        path.posix.join('.spec-n-roll/config/manifesto/steps', `${stepId}.md`),
        content,
        stepId,
        !registeredStepIds.has(stepId),
      );
    }),
  );

  return {
    global: buildManifestoFileView('global', GLOBAL_MANIFESTO_RELATIVE_PATH, globalContent),
    stepManifestos,
  };
}
