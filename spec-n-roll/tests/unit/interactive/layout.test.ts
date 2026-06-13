import path from 'node:path';
import type { EventEmitter } from 'node:events';

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { App } from '../../../src/cli/ink/app/App.js';
import {
  allocateFullscreenLayout,
  isMinimumLayout,
} from '../../../src/cli/ink/components/ContextContent.js';

/**
 * Source fixture used by shell layout rendering tests.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Escape sequence for the terminal down-arrow key.
 */
const DOWN_ARROW = '\u001B[B';

/**
 * Escape sequence for the terminal page-down key.
 */
const PAGE_DOWN = '\u001B[6~';

/**
 * Waits briefly for Ink effects and input handlers to finish a render pass.
 *
 * @returns Promise that resolves after one test render window.
 */
async function waitForFrame(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

/**
 * Sets the process stdout row count for Ink test renders.
 *
 * @param rows - Positive terminal row count to expose during the test.
 * @returns Cleanup callback that restores the previous descriptor.
 */
function setTerminalRows(rows: number): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'rows');
  Object.defineProperty(process.stdout, 'rows', {
    configurable: true,
    value: rows,
  });

  return () => {
    if (descriptor == null) {
      Reflect.deleteProperty(process.stdout, 'rows');
      return;
    }

    Object.defineProperty(process.stdout, 'rows', descriptor);
  };
}

/**
 * Sets the row count on an Ink test stdout stream and emits a resize event.
 *
 * @param stdout - Mock stdout stream returned by ink-testing-library.
 * @param rows - Positive terminal row count to expose during the test.
 */
function resizeTestStdout(stdout: EventEmitter, rows: number): void {
  Object.defineProperty(stdout, 'rows', {
    configurable: true,
    value: rows,
  });
  stdout.emit('resize');
}

/**
 * Creates the interactive app element used by shell layout assertions.
 *
 * @returns React element with stable fixture startup props.
 */
function createApp(): React.ReactElement {
  return React.createElement(App, {
    projectRoot: FIXTURE_ROOT,
    isInitialized: true,
    binaryContext: 'global',
  });
}

describe('fullscreen layout allocation', () => {
  it('allocates extra terminal rows to the context content area', () => {
    expect(
      allocateFullscreenLayout({
        terminalRows: 14,
        statusRows: 3,
        selectionRows: 5,
        minimumContextRows: 1,
      }),
    ).toEqual({
      terminalRows: 14,
      minimumRows: 9,
      statusRows: 3,
      selectionRows: 5,
      contentRows: 6,
      minimumSize: false,
    });
  });

  it('shrinks context rows before status or selection rows', () => {
    expect(
      allocateFullscreenLayout({
        terminalRows: 9,
        statusRows: 3,
        selectionRows: 5,
        minimumContextRows: 1,
      }),
    ).toMatchObject({
      statusRows: 3,
      selectionRows: 5,
      contentRows: 1,
      minimumSize: false,
    });
  });

  it('reports minimum-size state without negative content rows', () => {
    expect(
      allocateFullscreenLayout({
        terminalRows: 8,
        statusRows: 3,
        selectionRows: 5,
        minimumContextRows: 1,
      }),
    ).toMatchObject({
      minimumRows: 9,
      contentRows: 0,
      minimumSize: true,
    });
  });

  it('identifies layouts that should render the minimum-size message', () => {
    expect(
      isMinimumLayout(
        allocateFullscreenLayout({
          terminalRows: 8,
          statusRows: 3,
          selectionRows: 5,
          minimumContextRows: 1,
        }),
      ),
    ).toBe(true);
  });
});

describe('interactive shell fullscreen layout', () => {
  it('renders status, context, selection, and key hints in contract order', async () => {
    const restoreRows = setTerminalRows(14);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame.indexOf('Spec-N-Roll')).toBeLessThan(
      frame.indexOf('Review task specs and workflow progress.'),
    );
    expect(frame.indexOf('Review task specs and workflow progress.')).toBeLessThan(
      frame.indexOf('> 1 Task Specs'),
    );
    expect(frame.indexOf('> 1 Task Specs')).toBeLessThan(frame.indexOf('q quit'));

    app.unmount();
    restoreRows();
  });

  it('uses extra tall-terminal rows for lower-priority context details', async () => {
    const restoreSmallRows = setTerminalRows(12);
    const smallApp = render(createApp());

    await waitForFrame();
    expect(smallApp.lastFrame()).not.toContain(
      'Shows lifecycle status, workflow state, and recognized task spec directories.',
    );
    smallApp.unmount();
    restoreSmallRows();

    const restoreTallRows = setTerminalRows(18);
    const tallApp = render(createApp());

    await waitForFrame();
    expect(tallApp.lastFrame()).toContain(
      'Shows lifecycle status, workflow state, and recognized task spec directories.',
    );

    tallApp.unmount();
    restoreTallRows();
  });

  it('preserves focused context and selection state across terminal resize redraws', async () => {
    const restoreRows = setTerminalRows(18);
    const app = render(createApp());

    await waitForFrame();
    app.stdin.write(DOWN_ARROW);
    await waitForFrame();

    expect(app.lastFrame()).toContain('Inspect workflow variants and step order.');

    setTerminalRows(12);
    resizeTestStdout(app.stdout, 12);
    await waitForFrame();

    const resizedFrame = app.lastFrame() ?? '';
    expect(resizedFrame).toContain('Workflows');
    expect(resizedFrame).toContain('> 2 Workflows');
    expect(resizedFrame).toContain('Main Menu');
    expect(resizedFrame).not.toContain(
      'Shows lifecycle status, workflow state, and recognized task spec directories.',
    );

    app.unmount();
    restoreRows();
  });

  it('keeps constrained terminals usable while preserving full selection controls', async () => {
    const restoreRows = setTerminalRows(12);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame).toContain('Task Specs');
    expect(frame).toContain('> 1 Task Specs');
    expect(frame).toContain('5 Setup / Maintenance');
    expect(frame).not.toContain('Next: Open the task specs list.');

    app.unmount();
    restoreRows();
  });

  it('scrolls overflowing context content with page down', async () => {
    const restoreRows = setTerminalRows(12);
    const app = render(createApp());

    await waitForFrame();
    expect(app.lastFrame()).toContain('Task Specs');
    expect(app.lastFrame()).not.toContain('Status: Requires initialized project configuration.');

    app.stdin.write(PAGE_DOWN);
    await waitForFrame();

    expect(app.lastFrame()).toContain('Status: Requires initialized project configuration.');

    app.unmount();
    restoreRows();
  });

  it('renders a clear minimum-size message below the supported terminal height', async () => {
    const restoreRows = setTerminalRows(11);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame).toContain('Terminal is too small');
    expect(frame).toContain('Resize to at least 12 rows');
    expect(frame).not.toContain('> 1 Task Specs');
    expect(frame).not.toContain('q quit');

    app.unmount();
    restoreRows();
  });
});
