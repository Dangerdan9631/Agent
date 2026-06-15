import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import fse from 'fs-extra';

import { runConfigAgentRemove } from './config-agent.js';
import { readWorkflowConfig } from './workflow/artifacts.js';

/**
 * Options controlling project removal orchestration.
 */
export interface ProjectRemoveOptions {
  /**
   * Directory used to resolve the project root when no explicit root is provided.
   */
  cwd?: string;
  /**
   * Optional absolute initialized project root override.
   */
  projectRoot?: string;
  /**
   * When true, skips interactive confirmation and proceeds with removal.
   */
  skipConfirmation?: boolean;
  /**
   * Optional confirmation callback used by tests and interactive callers.
   */
  confirm?: () => Promise<boolean> | boolean;
}

/**
 * Outcome of a successful project removal run.
 */
export interface ProjectRemoveResult {
  /**
   * Absolute path to the project root that was cleaned.
   */
  projectRoot: string;
  /**
   * Managed project-relative paths removed during the operation.
   */
  removedPaths: string[];
  /**
   * Agent ids whose MCP entries and extension artifacts were removed.
   */
  agentMcpCleaned: string[];
}

/**
 * Resolves an initialized project root from an explicit path or upward tree walk.
 *
 * @param startDir - Directory to begin searching from when no explicit root is supplied.
 * @param explicitRoot - Optional absolute project root override.
 * @returns Absolute initialized project root.
 */
async function resolveInitializedProjectRoot(
  startDir: string,
  explicitRoot?: string,
): Promise<string> {
  if (explicitRoot != null) {
    const resolved = path.resolve(explicitRoot);
    const workflowConfig = await readWorkflowConfig(resolved);
    if (workflowConfig == null) {
      throw new Error('Project is not initialized.');
    }
    return resolved;
  }

  let current = path.resolve(startDir);
  while (true) {
    const workflowConfig = await readWorkflowConfig(current);
    if (workflowConfig != null) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error('Project is not initialized.');
}

/**
 * Prompts on stdin for destructive project removal confirmation.
 *
 * @param projectRoot - Absolute project root shown in the prompt.
 * @returns True when the user confirms removal.
 */
async function promptForRemovalConfirmation(projectRoot: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(
      `Remove Spec N' Roll and all managed files from ${projectRoot}? [y/N] `,
    );
    return answer.trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
}

/**
 * Removes toolkit-managed project files while preserving user-owned spec content.
 *
 * @param options - Project root, confirmation, and skip flags.
 * @returns Summary of removed managed paths and cleaned agent ids.
 */
export async function runProjectRemove(
  options: ProjectRemoveOptions,
): Promise<ProjectRemoveResult> {
  const projectRoot = await resolveInitializedProjectRoot(
    options.cwd ?? process.cwd(),
    options.projectRoot,
  );

  const confirmed =
    options.skipConfirmation === true
      ? true
      : options.confirm != null
        ? await options.confirm()
        : await promptForRemovalConfirmation(projectRoot);

  if (!confirmed) {
    throw new Error('Project removal cancelled.');
  }

  const workflowConfig = await readWorkflowConfig(projectRoot);
  if (workflowConfig == null) {
    throw new Error('Project is not initialized.');
  }

  const agentIds = workflowConfig.agents.map((agent) => agent.id);
  const agentMcpCleaned: string[] = [];

  if (agentIds.length > 0) {
    const removeResult = await runConfigAgentRemove({
      projectRoot,
      agents: agentIds,
    });
    for (const agent of removeResult.agents) {
      if (!agent.notConfigured) {
        agentMcpCleaned.push(agent.agentId);
      }
    }
  }

  const removedPaths: string[] = [];
  const specNRollDir = path.join(projectRoot, '.spec-n-roll');
  if (await fse.pathExists(specNRollDir)) {
    await fse.remove(specNRollDir);
    removedPaths.push('.spec-n-roll');
  }

  return {
    projectRoot,
    removedPaths,
    agentMcpCleaned,
  };
}
