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

/**
 * Polls until the rendered frame contains expected text.
 *
 * @param readFrame - Returns the latest rendered frame.
 * @param text - Text fragment to wait for.
 */
async function waitForText(readFrame: () => string | undefined, text: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (readFrame()?.includes(text) === true) {
      return;
    }
    await waitForFrame();
  }

  throw new Error(`Timed out waiting for frame to contain: ${text}`);
}

describe('complete interactive navigation', () => {
  it('updates local home context from focus without opening a route', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForText(app.lastFrame, 'Version:');

    app.stdin.write('\u001b[B');
    await waitForFrame();

    expect(app.lastFrame()).toContain('Inspect configured agents');
    expect(app.lastFrame()).toContain('Local Home');
    app.unmount();
  });

  it('reaches local home sections and returns with keyboard controls', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrame();
    expect(app.lastFrame()).toContain('Spec-N-Roll');

    app.stdin.write('1');
    await waitForFrame();
    expect(app.lastFrame()).toContain('1 Specs');
    app.stdin.write(ESCAPE);
    await waitForFrame();

    app.stdin.write('3');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Workflows');
    app.stdin.write('3');
    await waitForFrame();

    app.stdin.write('2');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Agents');
    app.stdin.write('5');
    await waitForFrame();

    app.stdin.write('1');
    await waitForFrame();
    expect(app.lastFrame()).toContain('Project Metadata');
    app.stdin.write('2');
    await waitForFrame();
    app.stdin.write('3');
    await waitForFrame();

    expect(app.lastFrame()).toContain('Local Home');
    app.unmount();
  });

  it('renders spec detail in the full route content slot', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForText(app.lastFrame, 'Version:');
    app.stdin.write('1');
    await waitForText(app.lastFrame, '1 Specs');
    app.stdin.write('1');
    await waitForText(app.lastFrame, '001-active-checkout');
    app.stdin.write('\r');
    await waitForText(app.lastFrame, 'lifecycle:');

    const frame = app.lastFrame() ?? '';
    expect(frame).toContain('Spec 001-active-checkout');
    expect(frame).toContain('lifecycle:');
    expect(frame).toContain('current step:');
    expect(frame).toContain('artifacts:');
    expect(frame).not.toContain('> 002 completed-migration');
    expect(frame).not.toContain('Choose a section to open.');
    app.unmount();
  });

  it('renders project metadata edit in the full route content slot', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForText(app.lastFrame, 'Version:');
    app.stdin.write('1');
    await waitForText(app.lastFrame, '1 Specs');
    app.stdin.write('2');
    await waitForText(app.lastFrame, 'e Edit metadata');
    app.stdin.write('e');
    await waitForText(app.lastFrame, 'Edit Project Metadata');

    const editFrame = app.lastFrame() ?? '';
    expect(editFrame).toContain('Edit Project Metadata');
    expect(editFrame).toContain('nextTaskSpecId:');
    expect(editFrame).toContain('Up/Down move, Enter apply');
    expect(editFrame).not.toContain('> 1 Specs');
    app.unmount();
  });
});
