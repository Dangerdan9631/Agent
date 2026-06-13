import path from 'node:path';
import React from 'react';
import { render } from 'ink';

import { readWorkflowConfig } from '../../workflow/artifacts.js';
import { buildVersionReport } from '../commands/version.js';
import { App } from '../ink/app/App.js';

/**
 * Options for launching the interactive Ink application.
 */
export interface LaunchInteractiveAppOptions {
  /**
   * Working directory used to resolve the project root.
   */
  cwd?: string;
  /**
   * Absolute path to the executed CLI entry script.
   */
  executedBinaryPath?: string;
}

/**
 * Detects whether the current project has readable workflow configuration.
 *
 * @param projectRoot - Absolute project root path to inspect.
 * @returns True when workflow configuration parses successfully.
 */
async function detectInitialized(projectRoot: string): Promise<boolean> {
  try {
    return (await readWorkflowConfig(projectRoot)) != null;
  } catch {
    return false;
  }
}

/**
 * Resolves startup context and renders the interactive Ink application.
 *
 * @param options - Optional launch context overrides for tests and dispatchers.
 */
export async function launchInteractiveApp(
  options: LaunchInteractiveAppOptions = {},
): Promise<void> {
  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const isInitialized = await detectInitialized(projectRoot);
  const versionReport = buildVersionReport({
    cwd: projectRoot,
    executedBinaryPath: options.executedBinaryPath,
  });

  const instance = render(
    React.createElement(App, {
      projectRoot,
      isInitialized,
      binaryContext: versionReport.invocation,
      localBinaryPath: versionReport.localCliPath,
    }),
  );

  try {
    await instance.waitUntilExit();
  } finally {
    instance.unmount();
  }
}
