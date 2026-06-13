import path from 'node:path';
import type { EventEmitter } from 'node:events';

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { App } from '../../../src/cli/ink/app/App.js';
import {
  allocateAppScaffoldingLayout,
  allocateFullscreenLayout,
  isMinimumLayout,
  KEY_HINT_REGION_ROWS,
  STATUS_REGION_ROWS,
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
 * Minimum terminal rows for normal app scaffolding rendering.
 */
const SCAFFOLDING_MINIMUM_ROWS = STATUS_REGION_ROWS + KEY_HINT_REGION_ROWS + 1;

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
  it('renders status, route content, and key hints in contract order', async () => {
    const restoreRows = setTerminalRows(14);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame.indexOf('Spec-N-Roll')).toBeLessThan(frame.indexOf('> 1 Task Specs'));
    expect(frame.indexOf('> 1 Task Specs')).toBeLessThan(frame.indexOf('q quit'));

    app.unmount();
    restoreRows();
  });

  it('uses extra tall-terminal rows for the route content area', async () => {
    const restoreSmallRows = setTerminalRows(12);
    const smallApp = render(createApp());

    await waitForFrame();
    const smallMiddleRows =
      (smallApp.lastFrame() ?? '').split('\n').length - STATUS_REGION_ROWS - KEY_HINT_REGION_ROWS;
    smallApp.unmount();
    restoreSmallRows();

    const restoreTallRows = setTerminalRows(18);
    const tallApp = render(createApp());

    await waitForFrame();
    const tallMiddleRows =
      (tallApp.lastFrame() ?? '').split('\n').length - STATUS_REGION_ROWS - KEY_HINT_REGION_ROWS;

    expect(tallMiddleRows).toBeGreaterThan(smallMiddleRows);

    tallApp.unmount();
    restoreTallRows();
  });

  it('preserves focused selection state across terminal resize redraws', async () => {
    const restoreRows = setTerminalRows(18);
    const app = render(createApp());

    await waitForFrame();
    app.stdin.write(DOWN_ARROW);
    await waitForFrame();

    expect(app.lastFrame()).toContain('> 2 Workflows');

    setTerminalRows(12);
    resizeTestStdout(app.stdout, 12);
    await waitForFrame();

    const resizedFrame = app.lastFrame() ?? '';
    expect(resizedFrame).toContain('> 2 Workflows');
    expect(resizedFrame).toContain('Main Menu');

    app.unmount();
    restoreRows();
  });

  it('keeps constrained terminals usable while preserving full selection controls', async () => {
    const restoreRows = setTerminalRows(12);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame).toContain('> 1 Task Specs');
    expect(frame).toContain('5 Setup / Maintenance');

    app.unmount();
    restoreRows();
  });

  it('renders a clear minimum-size message below the supported terminal height', async () => {
    const restoreRows = setTerminalRows(SCAFFOLDING_MINIMUM_ROWS - 1);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame).toContain('Terminal is too small');
    expect(frame).toContain(`Resize to at least ${SCAFFOLDING_MINIMUM_ROWS} rows`);
    expect(frame).not.toContain('> 1 Task Specs');
    expect(frame).not.toContain('q quit');

    app.unmount();
    restoreRows();
  });
});

describe('app scaffolding layout allocation', () => {
  it('allocates route content rows between fixed status and key hint chrome', () => {
    expect(
      allocateAppScaffoldingLayout({
        terminalRows: 20,
        statusRows: STATUS_REGION_ROWS,
        keyHintRows: KEY_HINT_REGION_ROWS,
        minimumRouteContentRows: 1,
      }),
    ).toEqual({
      terminalRows: 20,
      minimumRows: STATUS_REGION_ROWS + KEY_HINT_REGION_ROWS + 1,
      statusRows: STATUS_REGION_ROWS,
      keyHintRows: KEY_HINT_REGION_ROWS,
      routeContentRows: 20 - STATUS_REGION_ROWS - KEY_HINT_REGION_ROWS,
      minimumSize: false,
    });
  });

  it('shrinks route content rows while keeping fixed chrome row budgets stable', () => {
    const tall = allocateAppScaffoldingLayout({
      terminalRows: 24,
      statusRows: STATUS_REGION_ROWS,
      keyHintRows: KEY_HINT_REGION_ROWS,
      minimumRouteContentRows: 1,
    });
    const short = allocateAppScaffoldingLayout({
      terminalRows: 14,
      statusRows: STATUS_REGION_ROWS,
      keyHintRows: KEY_HINT_REGION_ROWS,
      minimumRouteContentRows: 1,
    });

    expect(tall.statusRows).toBe(short.statusRows);
    expect(tall.keyHintRows).toBe(short.keyHintRows);
    expect(tall.routeContentRows).toBeGreaterThan(short.routeContentRows);
    expect(short.routeContentRows).toBe(14 - STATUS_REGION_ROWS - KEY_HINT_REGION_ROWS);
  });

  it('reports minimum-size state without negative route content rows', () => {
    expect(
      allocateAppScaffoldingLayout({
        terminalRows: 4,
        statusRows: STATUS_REGION_ROWS,
        keyHintRows: KEY_HINT_REGION_ROWS,
        minimumRouteContentRows: 1,
      }),
    ).toMatchObject({
      minimumRows: STATUS_REGION_ROWS + KEY_HINT_REGION_ROWS + 1,
      routeContentRows: 0,
      minimumSize: true,
    });
  });
});

describe('app scaffolding shell layout', () => {
  it('renders status bar, route content area, and key hint overlay in contract order', async () => {
    const restoreRows = setTerminalRows(20);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame.indexOf('Spec-N-Roll')).toBeLessThan(frame.indexOf('> 1 Task Specs'));
    expect(frame.indexOf('> 1 Task Specs')).toBeLessThan(frame.indexOf('q quit'));

    app.unmount();
    restoreRows();
  });

  it('uses scaffolding minimum rows that reserve only fixed chrome plus minimal route content', async () => {
    const restoreRows = setTerminalRows(11);
    const app = render(createApp());

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame).not.toContain('Terminal is too small');
    expect(frame).toContain('> 1 Task Specs');

    app.unmount();
    restoreRows();
  });

  it('allocates terminal height changes only to the route content area', async () => {
    const restoreRows = setTerminalRows(22);
    const app = render(createApp());

    await waitForFrame();
    const tallFrame = app.lastFrame() ?? '';
    const tallLines = tallFrame.split('\n');

    resizeTestStdout(app.stdout, 16);
    await waitForFrame();
    const shortLines = (app.lastFrame() ?? '').split('\n');

    expect(shortLines.length).toBeLessThan(tallLines.length);
    expect(shortLines.slice(0, STATUS_REGION_ROWS)).toEqual(tallLines.slice(0, STATUS_REGION_ROWS));
    expect(shortLines.slice(-KEY_HINT_REGION_ROWS)).toEqual(tallLines.slice(-KEY_HINT_REGION_ROWS));

    app.unmount();
    restoreRows();
  });

  it('frees key hint rows for route content when hints are toggled hidden', async () => {
    const restoreRows = setTerminalRows(20);
    const app = render(createApp());

    await waitForFrame();
    const visibleLineCount = (app.lastFrame() ?? '').split('\n').length;

    app.stdin.write('?');
    await waitForFrame();
    const hiddenLineCount = (app.lastFrame() ?? '').split('\n').length;

    expect(hiddenLineCount).toBe(visibleLineCount);
    expect(app.lastFrame()).not.toContain('q quit');

    app.unmount();
    restoreRows();
  });

  it('replaces the route content area interior when navigating between routes', async () => {
    const restoreRows = setTerminalRows(20);
    const app = render(createApp());

    await waitForFrame();
    const mainMenuLines = (app.lastFrame() ?? '').split('\n');
    const mainMenuMiddle = mainMenuLines
      .slice(STATUS_REGION_ROWS, -KEY_HINT_REGION_ROWS)
      .join('\n');

    expect(mainMenuMiddle).toContain('> 1 Task Specs');
    expect(mainMenuMiddle).toContain('5 Setup / Maintenance');

    app.stdin.write('1');
    await waitForFrame();
    await waitForFrame();

    const specsFrame = app.lastFrame() ?? '';
    const specsLines = specsFrame.split('\n');

    expect(specsLines.slice(0, STATUS_REGION_ROWS).length).toBe(STATUS_REGION_ROWS);
    expect(specsLines.slice(-KEY_HINT_REGION_ROWS).length).toBe(KEY_HINT_REGION_ROWS);
    expect(specsLines.slice(STATUS_REGION_ROWS, -KEY_HINT_REGION_ROWS).join('\n')).not.toContain(
      '5 Setup / Maintenance',
    );
    expect(specsFrame).toContain('Task Specs');
    expect(specsFrame).toMatch(/001|active-checkout/);

    app.unmount();
    restoreRows();
  });
});
