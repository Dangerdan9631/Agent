import path from 'node:path';

import fse from 'fs-extra';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/cli/ink/app/App.js';
import * as manageLocalContentModule from '../../src/cli/ink/read-models/manage-local-content.js';

/**
 * Source fixture copied for setup maintenance flow tests.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Temporary project roots created by this test file.
 */
const tempRoots: string[] = [];

/**
 * Waits for Ink state updates and asynchronous screen effects.
 *
 * @param milliseconds - Delay in milliseconds before resolving.
 * @returns Promise that resolves after the delay.
 */
function waitForInk(milliseconds = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Waits until the rendered Ink frame contains the expected text.
 *
 * @param readFrame - Function that returns the latest rendered frame text.
 * @param expectedText - Text that must appear in the frame before resolving.
 * @param timeoutMs - Maximum wait time in milliseconds.
 * @returns Promise that resolves with the matching frame text.
 */
async function waitForFrameContaining(
  readFrame: () => string | undefined,
  expectedText: string,
  timeoutMs = 3_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const frame = readFrame();
    if (frame?.includes(expectedText) === true) {
      return frame;
    }

    await waitForInk();
  }

  return readFrame() ?? '';
}

/**
 * Creates an isolated initialized project fixture.
 *
 * @param prefix - Unique prefix describing the fixture purpose.
 * @returns Absolute path to the copied project fixture.
 */
async function copyFixtureProject(prefix: string): Promise<string> {
  const tempRoot = path.resolve(
    'node_modules',
    '.tmp',
    `interactive-setup-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fse.remove(tempRoot);
  await fse.copy(FIXTURE_ROOT, tempRoot);
  tempRoots.push(tempRoot);
  return tempRoot;
}

/**
 * Creates an empty project root for init flow tests.
 *
 * @returns Absolute path to the empty project root.
 */
async function createEmptyProject(): Promise<string> {
  const tempRoot = path.resolve(
    'node_modules',
    '.tmp',
    `interactive-setup-init-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fse.remove(tempRoot);
  await fse.ensureDir(tempRoot);
  tempRoots.push(tempRoot);
  return tempRoot;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const tempRoot of tempRoots.splice(0)) {
    await fse.remove(tempRoot);
  }
});

describe('interactive setup and maintenance flows', () => {
  it('initializes an empty project through the global home init action', async () => {
    const projectRoot = await createEmptyProject();
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: false,
        binaryContext: 'global',
      }),
    );

    await waitForInk();
    app.stdin.write('2');
    await waitForInk();
    app.stdin.write(' ');
    await waitForInk();
    app.stdin.write('\r');
    expect(
      await waitForFrameContaining(() => app.lastFrame(), 'initialized for agents', 15_000),
    ).toContain('initialized for agents');
    expect(
      await fse.pathExists(
        path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
      ),
    ).toBe(true);
    app.unmount();
  }, 15_000);

  it('shows version information on the global home screen', async () => {
    const projectRoot = await copyFixtureProject('version');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    const frame = await waitForFrameContaining(() => app.lastFrame(), 'Global Version:');

    expect(frame).toContain('Global Version:');
    expect(frame).toContain('Local Version:');
    expect(frame).toContain('Install Source:');
    expect(frame).toContain('Project:');
    expect(frame).not.toContain('Latest Version:');
    app.unmount();
  });

  it('runs update dry-run and apply through the manage screen update flow', async () => {
    const projectRoot = await copyFixtureProject('update');
    vi.spyOn(manageLocalContentModule, 'loadManageLocalContent').mockResolvedValue({
      fields: [
        { label: 'Global Version', value: 'v0.1.2' },
        { label: 'Local Version', value: 'v0.1.0' },
        { label: 'Project', value: projectRoot },
      ],
      globalInstallSource: {
        kind: 'remote',
        markerPath: path.join(projectRoot, '.source-package-root'),
      },
      versionComparison: {
        currentVersion: '0.1.0',
        latestLabel: '0.1.2',
        isUpToDate: false,
        comparisonTarget: 'global-install',
      },
      localVersion: '0.1.0',
      globalVersion: '0.1.2',
      refreshProjectDisabled: false,
      updateProjectDisabled: false,
      removeDisabled: false,
      reinstallDisabled: false,
    });

    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForInk();
    app.stdin.write('5');
    await waitForInk();
    app.stdin.write('2');
    await waitForInk();

    expect(await waitForFrameContaining(() => app.lastFrame(), 'Update toolkit')).toContain(
      'Update toolkit',
    );
    await waitForFrameContaining(() => app.lastFrame(), 'Press y to confirm');

    let updateStarted = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      app.stdin.write('y');
      await waitForInk(250);
      const frame = app.lastFrame() ?? '';
      if (
        frame.includes('Updated') ||
        frame.includes('Updating project') ||
        frame.includes('Applying')
      ) {
        updateStarted = true;
        break;
      }
    }
    expect(updateStarted).toBe(true);

    expect(await waitForFrameContaining(() => app.lastFrame(), 'Updated', 120_000)).toContain(
      'Updated',
    );
    app.unmount();
  }, 150_000);
});
