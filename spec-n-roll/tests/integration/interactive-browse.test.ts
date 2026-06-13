import path from 'node:path';

import fse from 'fs-extra';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '../../src/cli/ink/app/App.js';

/**
 * Source fixture copied for each browse integration test.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Temporary directories created by this test file and removed after each test.
 */
const tempRoots: string[] = [];

/**
 * Minimal rendered Ink app shape needed by polling helpers.
 */
interface RenderedInkApp {
  /**
   * Returns the most recent terminal frame, or undefined before the first render.
   */
  lastFrame: () => string | undefined;
}

/**
 * Waits briefly for Ink state updates and asynchronous read models to settle.
 *
 * @returns Promise that resolves after the UI has had one update window.
 */
async function waitForFrame(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

/**
 * Polls the current Ink frame until expected text is visible.
 *
 * @param app - Rendered Ink application under test.
 * @param text - Text fragment expected to appear in the terminal frame.
 * @returns Promise that resolves when the text appears.
 */
async function waitForText(app: RenderedInkApp, text: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (app.lastFrame()?.includes(text) === true) {
      return;
    }
    await waitForFrame();
  }
}

/**
 * Creates an isolated project fixture for read-only browse tests.
 *
 * @returns Absolute path to the copied fixture root.
 */
async function copyFixtureProject(): Promise<string> {
  const tempRoot = path.join('node_modules', '.tmp', `interactive-browse-${Date.now()}`);
  await fse.remove(tempRoot);
  await fse.copy(FIXTURE_ROOT, tempRoot);
  const resolved = path.resolve(tempRoot);
  tempRoots.push(resolved);
  return resolved;
}

/**
 * Collects file contents keyed by project-relative path.
 *
 * @param projectRoot - Absolute path to the project fixture.
 * @returns Map of relative file paths to UTF-8 contents.
 */
async function snapshotFiles(projectRoot: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();

  async function visit(directory: string): Promise<void> {
    const entries = await fse.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        snapshot.set(
          path.relative(projectRoot, absolutePath),
          await fse.readFile(absolutePath, 'utf8'),
        );
      }
    }
  }

  await visit(projectRoot);
  return snapshot;
}

afterEach(async () => {
  for (const tempRoot of tempRoots.splice(0)) {
    await fse.remove(tempRoot);
  }
});

describe('interactive browse flow', () => {
  it('navigates read-only top-level browse sections without mutating project files', async () => {
    const projectRoot = await copyFixtureProject();
    const before = await snapshotFiles(projectRoot);
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    app.stdin.write('1');
    await waitForText(app, '001 active-checkout');
    expect(app.lastFrame()).toContain('001 active-checkout');
    expect(app.lastFrame()).toContain('Lifecycle: Active; workflow: active.');
    expect(app.lastFrame()).toContain('Step: implement; workflow variant: quick.');
    expect(app.lastFrame()).toContain('Unrecognized');

    app.stdin.write('\u001b[B');
    await waitForText(app, '002 completed-migration');
    expect(app.lastFrame()).toContain('002 completed-migration');
    expect(app.lastFrame()).toContain('Lifecycle: Complete; workflow: complete.');
    expect(app.lastFrame()).toContain('Step: implement; workflow variant: full.');

    app.stdin.write('\u001b[A');
    await waitForText(app, '001 active-checkout');

    app.stdin.write('\r');
    await waitForText(app, 'Workflow state');
    expect(app.lastFrame()).toContain('Workflow state');
    expect(app.lastFrame()).toContain('current step: implement');

    app.stdin.write('\u001b');
    app.stdin.write('\u001b');
    await waitForFrame();

    app.stdin.write('2');
    await waitForText(app, 'Quick');
    expect(app.lastFrame()).toContain('Quick');
    expect(app.lastFrame()).toContain('Workflow quick');
    expect(app.lastFrame()).toContain('Default workflow for this project.');
    expect(app.lastFrame()).toContain('specify > tasks > implement');

    app.stdin.write('\r');
    await waitForText(app, 'Workflow quick');
    expect(app.lastFrame()).toContain('Workflow quick');

    app.stdin.write('\u001b');
    app.stdin.write('\u001b');
    await waitForFrame();

    app.stdin.write('3');
    await waitForText(app, 'claude-code');
    expect(app.lastFrame()).toContain('codex');
    expect(app.lastFrame()).toContain('Agent claude-code');
    expect(app.lastFrame()).toContain('Shown in all agents filter.');

    app.stdin.write('\u001b[B');
    await waitForText(app, 'Agent codex');
    expect(app.lastFrame()).toContain('Agent codex');
    expect(app.lastFrame()).toContain('Shown in all agents filter.');
    expect(app.lastFrame()).toContain('configured');

    app.stdin.write('\u001b');
    await waitForFrame();

    app.stdin.write('4');
    await waitForText(app, 'next task spec id: 3');
    expect(app.lastFrame()).toContain('next task spec id: 3');
    expect(app.lastFrame()).toContain('current task: 001-active-checkout');

    app.unmount();
    expect(await snapshotFiles(projectRoot)).toEqual(before);
  });
});
