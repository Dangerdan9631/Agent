import path from 'node:path';

import fse from 'fs-extra';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/cli/ink/app/App.js';
import * as manageLocalContentModule from '../../src/cli/ink/read-models/manage-local-content.js';
import { writeTaskMetadata } from '../../src/core/task-metadata.js';

/**
 * Source fixture copied for local home integration tests.
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
 * Creates an isolated initialized project fixture for local home tests.
 *
 * @param prefix - Unique prefix describing the fixture purpose.
 * @returns Absolute path to the copied project fixture.
 */
async function copyFixtureProject(prefix: string): Promise<string> {
  const tempRoot = path.resolve(
    'node_modules',
    '.tmp',
    `interactive-local-home-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fse.remove(tempRoot);
  await fse.copy(FIXTURE_ROOT, tempRoot);
  await writeTaskMetadata(tempRoot, '001', 'active-checkout', {
    createdAt: '2026-06-13T07:30:00.000Z',
    implementationStartedAt: '2026-06-13T08:15:00.000Z',
  });
  tempRoots.push(tempRoot);
  return tempRoot;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const tempRoot of tempRoots.splice(0)) {
    await fse.remove(tempRoot);
  }
});

describe('interactive local home', () => {
  it('renders local-home content for local binary context', async () => {
    const projectRoot = await copyFixtureProject('initialized');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    const frame = await waitForFrameContaining(() => app.lastFrame(), 'Next task spec id:');
    expect(frame).toContain('Version:');
    expect(frame).toContain('(local)');
    expect(frame).toContain('Latest Version:');
    expect(frame).toContain('Project:');
    expect(frame).toContain('Next task spec id:');
    expect(frame).toContain('Updated at:');
    expect(frame).toContain('Current task:');
    expect(frame).toContain('001 Active Checkout');
    expect(frame).toContain('Created at:');
    expect(frame).toContain('Implementation started at:');
    app.unmount();
  });

  it('shows six menu options with Extensions permanently disabled', async () => {
    const projectRoot = await copyFixtureProject('menu');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    const frame = await waitForFrameContaining(() => app.lastFrame(), '1 Project');
    expect(frame).toContain('1 Project');
    expect(frame).toContain('2 Agents');
    expect(frame).toContain('3 Workflows');
    expect(frame).toContain('4 Extensions');
    expect(frame).toContain("5 Manage Spec N' Roll");
    expect(frame).toContain('6 Quit');
    expect(frame).not.toContain('> 4 Extensions');
    app.unmount();
  });

  it('navigates to project-hub when Project is selected', async () => {
    const projectRoot = await copyFixtureProject('project-nav');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrameContaining(() => app.lastFrame(), '1 Project');
    app.stdin.write('1');
    const frame = await waitForFrameContaining(
      () => app.lastFrame(),
      'This screen is reserved for a later implementation phase.',
    );
    expect(frame).toContain('Project');
    app.unmount();
  });

  it('navigates to agents-list when Agents is selected', async () => {
    const projectRoot = await copyFixtureProject('agents-nav');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrameContaining(() => app.lastFrame(), '2 Agents');
    app.stdin.write('2');
    const frame = await waitForFrameContaining(() => app.lastFrame(), 'filter:');
    expect(frame).toContain('Agents');
    app.unmount();
  });

  it('navigates to workflows-list when Workflows is selected', async () => {
    const projectRoot = await copyFixtureProject('workflows-nav');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrameContaining(() => app.lastFrame(), '3 Workflows');
    app.stdin.write('3');
    const frame = await waitForFrameContaining(
      () => app.lastFrame(),
      'Inspect configured workflow variants',
    );
    expect(frame).toContain('Workflows');
    app.unmount();
  });

  it('navigates to manage-local when Manage is selected', async () => {
    const projectRoot = await copyFixtureProject('manage-nav');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrameContaining(() => app.lastFrame(), "5 Manage Spec N' Roll");
    app.stdin.write('5');
    const frame = await waitForFrameContaining(
      () => app.lastFrame(),
      "1 Update Spec N' Roll",
    );
    expect(frame).toContain("Manage Spec N' Roll");
    expect(frame).toContain('Version:');
    expect(frame).toContain('(local)');
    expect(frame).toContain('Latest Version:');
    expect(frame).toContain('Project:');
    expect(frame).toContain('2 Upgrade Project');
    expect(frame).toContain("3 Remove Spec N' Roll");
    expect(frame).toContain("4 Re-install Spec N' Roll");
    expect(frame).toContain('5 Back');
    app.unmount();
  });

  it('disables update on manage screen when local version matches global', async () => {
    const projectRoot = await copyFixtureProject('manage-up-to-date');
    vi.spyOn(manageLocalContentModule, 'loadManageLocalContent').mockResolvedValue({
      fields: [
        { label: 'Version', value: 'v1.0.0 (local)' },
        { label: 'Latest Version', value: 'Up to date' },
        { label: 'Project', value: projectRoot },
      ],
      versionComparison: {
        currentVersion: '1.0.0',
        latestLabel: 'Up to date',
        isUpToDate: true,
        comparisonTarget: 'global-install',
      },
      updateDisabled: true,
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

    await waitForFrameContaining(() => app.lastFrame(), "5 Manage Spec N' Roll");
    app.stdin.write('5');
    const frame = await waitForFrameContaining(
      () => app.lastFrame(),
      '2 Upgrade Project - Run the full project upgrade workflow',
    );
    expect(frame).toContain('Latest Version: Up to date');
    expect(frame).toContain('> 2 Upgrade Project');
    expect(frame).not.toContain("> 1 Update Spec N' Roll");
    app.unmount();
  });

  it('returns to local-home when Back is selected on manage screen', async () => {
    const projectRoot = await copyFixtureProject('manage-back');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrameContaining(() => app.lastFrame(), "5 Manage Spec N' Roll");
    app.stdin.write('5');
    await waitForFrameContaining(() => app.lastFrame(), '5 Back');
    app.stdin.write('5');
    const frame = await waitForFrameContaining(() => app.lastFrame(), '1 Project');
    expect(frame).toContain('Local Home');
    expect(frame).toContain('1 Project');
    app.unmount();
  });

  it('shows remove confirmation on manage screen', async () => {
    const projectRoot = await copyFixtureProject('manage-remove-confirm');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrameContaining(() => app.lastFrame(), "5 Manage Spec N' Roll");
    app.stdin.write('5');
    await waitForFrameContaining(() => app.lastFrame(), "3 Remove Spec N' Roll");
    app.stdin.write('3');
    const frame = await waitForFrameContaining(
      () => app.lastFrame(),
      'Remove managed Spec N',
    );
    expect(frame).toContain("Remove Spec N' Roll");
    app.unmount();
  });
});
