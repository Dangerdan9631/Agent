import path from 'node:path';

import fse from 'fs-extra';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '../../src/cli/ink/app/App.js';

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
  for (const tempRoot of tempRoots.splice(0)) {
    await fse.remove(tempRoot);
  }
});

describe('interactive setup and maintenance flows', () => {
  it('initializes an empty project through the setup menu', async () => {
    const projectRoot = await createEmptyProject();
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: false,
        binaryContext: 'global',
      }),
    );

    await waitForInk();
    app.stdin.write('5');
    await waitForInk();
    app.stdin.write('\r');
    await waitForInk();
    app.stdin.write(' ');
    await waitForInk();
    app.stdin.write('\r');
    await waitForInk(1500);

    expect(app.lastFrame()).toContain('initialized for agents');
    expect(
      await fse.pathExists(
        path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
      ),
    ).toBe(true);
    app.unmount();
  }, 15_000);

  it('shows version information from the setup menu', async () => {
    const projectRoot = await copyFixtureProject('version');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForInk();
    app.stdin.write('5');
    await waitForInk();
    app.stdin.write('2');
    await waitForInk();

    expect(app.lastFrame()).toContain('Version Info');
    expect(app.lastFrame()).toContain('toolkit version:');
    expect(app.lastFrame()).toContain('invocation:');
    app.unmount();
  });

  it('runs update dry-run and apply through the setup menu confirmation', async () => {
    const projectRoot = await copyFixtureProject('update');
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForInk();
    app.stdin.write('5');
    await waitForInk();
    app.stdin.write('3');
    await waitForInk();

    app.stdin.write('d');
    await waitForInk(500);
    expect(app.lastFrame()).toContain('dry run:');

    app.stdin.write('a');
    await waitForInk(500);
    expect(app.lastFrame()).toContain('Update toolkit');

    app.stdin.write('y');
    await waitForInk(1000);
    expect(app.lastFrame()).toContain('updated:');
    app.unmount();
  }, 15_000);
});
