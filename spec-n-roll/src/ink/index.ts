import path from 'node:path';
import React from 'react';
import { render } from 'ink';

import '../di/bootstrap.js';

import { rootContainer } from '../di/container.js';
import { INTERACTIVE_APP_SERVICES, LOGGER_FACTORY } from '../di/tokens.js';
import { isCurrentModuleEntrypoint } from '../sdk/core/paths.js';
import { readWorkflowConfig } from '../sdk/workflow/artifacts.js';
import { buildCliVersionReport } from '../cli/version-invocation.js';
import { App } from './app/App.js';

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
  const versionReport = buildCliVersionReport({
    cwd: projectRoot,
    executedBinaryPath: options.executedBinaryPath,
  });
  const services = rootContainer.resolve(INTERACTIVE_APP_SERVICES);

  const instance = render(
    React.createElement(App, {
      projectRoot,
      isInitialized,
      binaryContext: versionReport.invocation,
      localBinaryPath: versionReport.localCliPath,
      services,
    }),
  );

  try {
    await instance.waitUntilExit();
  } finally {
    instance.unmount();
  }
}

const isMainModule = isCurrentModuleEntrypoint(process.argv[1], import.meta.url, [
  'index.js',
  'index.ts',
]);

if (isMainModule) {
  launchInteractiveApp({ executedBinaryPath: process.argv[1] })
    .then(() => {
      process.exit(process.exitCode ?? 0);
    })
    .catch((error: unknown) => {
      const loggerFactory = rootContainer.resolve(LOGGER_FACTORY);
      loggerFactory.create('ink').error(error);
      process.exit(1);
    });
}
