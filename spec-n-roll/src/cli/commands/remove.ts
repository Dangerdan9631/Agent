import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Command } from 'commander';
import fse from 'fs-extra';

import { readWorkflowConfig } from '../../workflow/artifacts.js';
import { runConfigAgentRemove } from './config-agent-remove.js';

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

/**
 * Registers the `remove` subcommand on the root Commander program.
 *
 * @param program - Root Commander program to attach the command to.
 */
export function registerRemoveCommand(program: Command): void {
  program
    .command('remove')
    .description('Remove Spec-N-Roll managed files from the current project')
    .option('--yes', 'Skip confirmation prompt and proceed with removal')
    .option('--project-root <path>', 'Absolute project root override')
    .action(async (commandOptions: { yes?: boolean; projectRoot?: string }) => {
      await handleRemoveCommand(commandOptions);
    });
}

/**
 * Commander action handler for `spec-n-roll remove`.
 *
 * @param commandOptions - Parsed Commander options for the remove command.
 */
export async function handleRemoveCommand(commandOptions: {
  yes?: boolean;
  projectRoot?: string;
}): Promise<void> {
  try {
    const result = await runProjectRemove({
      cwd: process.cwd(),
      projectRoot: commandOptions.projectRoot,
      skipConfirmation: commandOptions.yes === true,
    });

    console.log(`Removed Spec-N-Roll managed files from ${result.projectRoot}.`);
    for (const removedPath of result.removedPaths) {
      console.log(`- ${removedPath}`);
    }
    if (result.agentMcpCleaned.length > 0) {
      console.log(`Cleaned agent MCP entries: ${result.agentMcpCleaned.join(', ')}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`remove failed: ${message}`);
    process.exitCode = 1;
  }
}
