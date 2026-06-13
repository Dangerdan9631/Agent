import path from 'node:path';

import { render } from 'ink-testing-library';
import React from 'react';
import { Text, useInput } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../../src/cli/ink/app/App.js';
import {
  isHomeRoute,
  QUIT_CONFIRMATION_MESSAGE,
  QUIT_CONFIRMATION_TIMEOUT_MS,
  reduceQuitKeyPress,
  useQuitConfirmation,
} from '../../../src/cli/ink/hooks/use-quit-confirmation.js';

/**
 * Source fixture used by quit confirmation tests.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Escape key sequence used by Ink tests.
 */
const ESCAPE = '\u001b';

/**
 * Props for the hook test harness that mirrors app-shell quit input routing.
 */
interface QuitHarnessProps {
  /**
   * Called when the hook confirms quit.
   */
  onExit: () => void;
  /**
   * Whether home-screen Esc should start quit confirmation.
   */
  homeEscStartsQuit: boolean;
}

/**
 * Minimal Ink harness that wires stdin to {@link useQuitConfirmation} handlers.
 *
 * @param props - Exit callback and home Esc routing flag.
 * @returns React element rendering pending state for assertions.
 */
function QuitHarness(props: QuitHarnessProps): React.ReactElement {
  const quit = useQuitConfirmation(props.onExit);

  useInput((input, key) => {
    if (input === 'q') {
      quit.onQuitKey();
      return;
    }

    if (quit.pending) {
      quit.onOtherKey();
      return;
    }

    if (props.homeEscStartsQuit && key.escape) {
      quit.onQuitKey();
    }
  });

  return React.createElement(Text, null, quit.pending ? quit.message : 'idle');
}

/**
 * Waits briefly for Ink state updates and timers to settle in tests.
 *
 * @returns Promise that resolves after one render window.
 */
async function waitForFrame(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

/**
 * Flushes React state after advancing fake timers in timeout tests.
 *
 * @returns Promise that resolves after timer and render updates settle.
 */
async function flushFakeTimers(): Promise<void> {
  await vi.advanceTimersByTimeAsync(30);
}

describe('quit confirmation helpers', () => {
  it('identifies home routes for Esc-to-quit routing', () => {
    expect(isHomeRoute('global-home')).toBe(true);
    expect(isHomeRoute('local-home')).toBe(true);
    expect(isHomeRoute('project-hub')).toBe(false);
    expect(isHomeRoute('specs-list')).toBe(false);
  });

  it('starts pending on first quit key and confirms exit on second', () => {
    expect(reduceQuitKeyPress(false)).toEqual({ pending: true, action: 'start-pending' });
    expect(reduceQuitKeyPress(true)).toEqual({ pending: false, action: 'confirm-exit' });
  });
});

describe('useQuitConfirmation', () => {
  it('shows confirmation on first q without exiting', async () => {
    const onExit = vi.fn();
    const app = render(React.createElement(QuitHarness, { onExit, homeEscStartsQuit: false }));

    await waitForFrame();
    app.stdin.write('q');
    await waitForFrame();

    expect(app.lastFrame()).toContain(QUIT_CONFIRMATION_MESSAGE);
    expect(onExit).not.toHaveBeenCalled();

    app.unmount();
  });

  it('exits on second q within the timeout window', async () => {
    const onExit = vi.fn();
    const app = render(React.createElement(QuitHarness, { onExit, homeEscStartsQuit: false }));

    await waitForFrame();
    app.stdin.write('q');
    await waitForFrame();
    app.stdin.write('q');
    await waitForFrame();

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(app.lastFrame()).toBe('idle');

    app.unmount();
  });

  it('cancels pending quit when another key is pressed', async () => {
    const onExit = vi.fn();
    const app = render(React.createElement(QuitHarness, { onExit, homeEscStartsQuit: false }));

    await waitForFrame();
    app.stdin.write('q');
    await waitForFrame();
    app.stdin.write('x');
    await waitForFrame();

    expect(onExit).not.toHaveBeenCalled();
    expect(app.lastFrame()).toBe('idle');

    app.unmount();
  });

  it('cancels pending quit after the timeout elapses', async () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    const app = render(React.createElement(QuitHarness, { onExit, homeEscStartsQuit: false }));

    await flushFakeTimers();
    app.stdin.write('q');
    await flushFakeTimers();
    expect(app.lastFrame()).toContain(QUIT_CONFIRMATION_MESSAGE);

    await vi.advanceTimersByTimeAsync(QUIT_CONFIRMATION_TIMEOUT_MS);
    await flushFakeTimers();

    expect(onExit).not.toHaveBeenCalled();
    expect(app.lastFrame()).toBe('idle');

    vi.useRealTimers();
    app.unmount();
  });

  it('starts quit confirmation when home Esc is routed through the hook', async () => {
    const onExit = vi.fn();
    const app = render(React.createElement(QuitHarness, { onExit, homeEscStartsQuit: true }));

    await waitForFrame();
    app.stdin.write(ESCAPE);
    await waitForFrame();

    expect(app.lastFrame()).toContain(QUIT_CONFIRMATION_MESSAGE);
    expect(onExit).not.toHaveBeenCalled();

    app.unmount();
  });
});

describe('App quit confirmation integration', () => {
  it('shows confirmation on first q and exits on second q without immediate exit', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    app.stdin.write('q');
    await waitForFrame();

    const pendingFrame = app.lastFrame() ?? '';
    expect(pendingFrame).toContain(QUIT_CONFIRMATION_MESSAGE);
    expect(pendingFrame).toContain('Global Home');

    app.stdin.write('q');
    await waitForFrame();
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
    await waitForFrame();

    expect(app.lastFrame() ?? '').not.toContain(QUIT_CONFIRMATION_MESSAGE);
    app.unmount();
  });

  it('cancels pending quit on home Esc while confirmation is visible', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    app.stdin.write('q');
    await waitForFrame();
    expect(app.lastFrame()).toContain(QUIT_CONFIRMATION_MESSAGE);

    app.stdin.write(ESCAPE);
    await waitForFrame();

    expect(app.lastFrame()).not.toContain(QUIT_CONFIRMATION_MESSAGE);
    app.unmount();
  });

  it('starts quit confirmation on home Esc and pops route on sub-screen Esc', async () => {
    const app = render(
      React.createElement(App, {
        projectRoot: FIXTURE_ROOT,
        isInitialized: true,
        binaryContext: 'local',
      }),
    );

    await waitForFrame();
    await waitForFrame();
    app.stdin.write(ESCAPE);
    await waitForFrame();
    expect(app.lastFrame()).toContain(QUIT_CONFIRMATION_MESSAGE);

    app.stdin.write('x');
    await waitForFrame();
    expect(app.lastFrame()).not.toContain(QUIT_CONFIRMATION_MESSAGE);

    app.stdin.write('2');
    await waitForFrame();
    await waitForFrame();
    expect(app.lastFrame()).toContain('Agents');

    app.stdin.write(ESCAPE);
    await waitForFrame();
    expect(app.lastFrame()).not.toContain(QUIT_CONFIRMATION_MESSAGE);
    expect(app.lastFrame()).toContain('Local Home');

    app.unmount();
  });
});
