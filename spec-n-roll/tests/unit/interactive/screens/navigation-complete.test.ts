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
    expect(app.lastFrame()).toContain('Setup / Maintenance');
    app.stdin.write('b');
    await waitForFrame();

    expect(app.lastFrame()).toContain('Spec-N-Roll');
    app.unmount();
  });
});
