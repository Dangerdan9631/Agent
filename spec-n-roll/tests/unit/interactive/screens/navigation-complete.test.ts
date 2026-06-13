import path from 'node:path';

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { App } from '../../../../src/cli/ink/app/App.js';

/**
 * Source fixture used by keyboard-only navigation tests.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Escape key sequence used by Ink tests to trigger back navigation.
 */
const ESCAPE = '\u001b';

/**
 * Waits briefly for Ink state updates and asynchronous read models to settle.
 *
 * @returns Promise that resolves after the UI has had one update window.
 */
async function waitForFrame(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

describe('complete interactive navigation', () => {
  it('updates main menu context from focus without opening a route', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    expect(app.lastFrame()).toContain('Review task specs and workflow progress.');

    app.stdin.write('\u001b[B');
    await waitForFrame();

    expect(app.lastFrame()).toContain('Inspect workflow variants and step order.');
    expect(app.lastFrame()).toContain('Main Menu');
    app.unmount();
  });

  it('reaches all five main-menu sections and returns with keyboard controls', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    expect(app.lastFrame()).toContain('Spec-N-Roll');

    app.stdin.write('1');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Task Specs');
    app.stdin.write(ESCAPE);
    await waitForFrame();

    app.stdin.write('2');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Workflows');
    app.stdin.write(ESCAPE);
    await waitForFrame();

    app.stdin.write('3');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Agents');
    app.stdin.write(ESCAPE);
    await waitForFrame();

    app.stdin.write('4');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Project');
    app.stdin.write(ESCAPE);
    await waitForFrame();

    app.stdin.write('5');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Initialize project');
    app.stdin.write('b');
    await waitForFrame();

    expect(app.lastFrame()).toContain('Spec-N-Roll');
    app.unmount();
  });

  it('renders spec detail in the full route content slot', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    app.stdin.write('1');
    await waitForFrame();
    app.stdin.write('\r');
    await waitForFrame();
    await waitForFrame();

    const frame = app.lastFrame() ?? '';
    expect(frame).toContain('Spec 001-active-checkout');
    expect(frame).toContain('lifecycle:');
    expect(frame).toContain('current step:');
    expect(frame).toContain('artifacts:');
    expect(frame).not.toContain('> 002 completed-migration');
    expect(frame).not.toContain('Choose a section to open.');
    app.unmount();
  });

  it('renders form and confirmation routes in the full route content slot', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    app.stdin.write('1');
    await waitForFrame();
    app.stdin.write('\r');
    await waitForFrame();
    app.stdin.write('m');
    await waitForFrame();
    app.stdin.write('\r');
    await waitForFrame();

    const statusFrame = app.lastFrame() ?? '';
    expect(statusFrame).toContain('Set Task Status');
    expect(statusFrame).toContain('target: 001-active-checkout');
    expect(statusFrame).toContain('Active');
    expect(statusFrame).not.toContain('Choose a section to open.');

    for (let step = 0; step < 4; step += 1) {
      app.stdin.write(ESCAPE);
      await waitForFrame();
    }

    app.stdin.write('4');
    await waitForFrame();
    app.stdin.write('e');
    await waitForFrame();

    const editFrame = app.lastFrame() ?? '';
    expect(editFrame).toContain('Edit Project Metadata');
    expect(editFrame).toContain('nextTaskSpecId:');
    expect(editFrame).toContain('Up/Down move, Enter apply');
    expect(editFrame).not.toContain('> 1 Task Specs');
    app.unmount();
  });
});
