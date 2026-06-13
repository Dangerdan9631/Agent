import path from 'node:path';

import fse from 'fs-extra';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/cli/ink/app/App.js';
import * as globalHomeContentModule from '../../src/cli/ink/read-models/global-home-content.js';

/**
 * Source fixture copied for global home integration tests.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Temporary project roots created by this test file.
 */
const tempRoots: string[] = [];

/**
 * Waits for Ink state updates and asynchronous read models to settle.
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
    `interactive-global-home-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fse.remove(tempRoot);
  await fse.copy(FIXTURE_ROOT, tempRoot);
  tempRoots.push(tempRoot);
  return tempRoot;
}

/**
 * Creates an empty project root for uninitialized global home tests.
 *
 * @returns Absolute path to the empty project root.
 */
async function createEmptyProject(): Promise<string> {
  const tempRoot = path.resolve(
    'node_modules',
    '.tmp',
    `interactive-global-home-empty-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

describe('interactive global home', () => {
  it('renders global-home content for global binary context', async () => {
    const projectRoot = await copyFixtureProject('initialized');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    const frame = await waitForFrameContaining(() => app.lastFrame(), 'Install Source:');
    expect(frame).toContain('Global Home');
    expect(frame).toContain('Version:');
    expect(frame).toContain('(global)');
    expect(frame).toContain('Latest Version:');
    expect(frame).toContain('Project:');
    expect(frame).toMatch(/interactive-global-h\s*ome-initialized/);
    expect(frame).toContain('Project Status: Initialized');
    expect(frame).toContain("1 Update Spec N' Roll");
    expect(frame).toContain('2 Init Project');
    expect(frame).toContain("5 Quit");
    app.unmount();
  });

  it('shows uninitialized project status and disables remove actions', async () => {
    const projectRoot = await createEmptyProject();
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: false,
        binaryContext: 'global',
      }),
    );

    const frame = await waitForFrameContaining(() => app.lastFrame(), 'Not initialized');
    expect(frame).toContain('Project Status: Not initialized');
    expect(frame).toContain('> 1 Update Spec N\' Roll');
    expect(frame).toContain("3 Remove Spec N' Roll");
    expect(frame).toContain("4 Re-install Spec N' Roll");
    app.unmount();
  });

  it('disables update when remote install is up to date', async () => {
    const projectRoot = await copyFixtureProject('up-to-date');
    vi.spyOn(globalHomeContentModule, 'loadGlobalHomeContent').mockResolvedValue({
      fields: [
        { label: 'Install Source', value: 'Remote' },
        { label: 'Version', value: 'v1.0.0 (global)' },
        { label: 'Latest Version', value: 'Up to date' },
        { label: 'Project', value: projectRoot },
        { label: 'Project Status', value: 'Initialized' },
      ],
      installSource: {
        kind: 'remote',
        markerPath: path.join(projectRoot, '.source-package-root'),
      },
      versionComparison: {
        currentVersion: '1.0.0',
        latestLabel: 'Up to date',
        isUpToDate: true,
        comparisonTarget: 'npm-registry',
      },
      updateDisabled: true,
      removeDisabled: false,
      reinstallDisabled: false,
    });

    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    const frame = await waitForFrameContaining(
      () => app.lastFrame(),
      "2 Init Project - Initialize this project",
    );
    expect(frame).toContain('Install Source: Remote');
    expect(frame).toContain('> 2 Init Project');
    expect(frame).not.toContain("> 1 Update Spec N' Roll");
    app.unmount();
  });
});
