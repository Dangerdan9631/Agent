import React from 'react';
import { Text } from 'ink';
import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionLayout } from '#runtime/presentation/ink/layouts/action-layout.jsx';
import { AppScaffold } from '#runtime/presentation/ink/layouts/app-scaffold.jsx';
import { ConsoleHistory } from '#runtime/presentation/ink/layouts/console-history.js';
import { ConsoleLayout } from '#runtime/presentation/ink/layouts/console-layout.jsx';
import { ConsoleOutputBuffer } from '#runtime/presentation/ink/layouts/console-output-buffer.js';
import { RuntimeUiApp } from '#runtime/presentation/ink/runtime-ui-app.jsx';
import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('runtime Ink layouts', () => {
  it('keeps page scrolling visible and shows the back hint only when enabled', () => {
    const disabledBack = render(
      <AppScaffold
        backEnabled={false}
        hintRows={3}
        routeLayout={<Text>Route content</Text>}
        routeLayoutRows={12}
        terminalColumns={80}
        terminalRows={18}
        title="Home"
        titleRows={3}
      />,
    );

    expect(disabledBack.lastFrame()).toContain("Spec N' Roll · Home");
    expect(disabledBack.lastFrame()).toContain('Page Up/Down scroll');
    expect(disabledBack.lastFrame()).not.toContain('Esc back');

    const enabledBack = render(
      <AppScaffold
        backEnabled
        hintRows={3}
        routeLayout={<Text>Route content</Text>}
        routeLayoutRows={12}
        terminalColumns={80}
        terminalRows={18}
        title="Agents"
        titleRows={3}
      />,
    );

    expect(enabledBack.lastFrame()).toContain('Esc back');
  });

  it('keeps title and hint chrome visible when route content overflows', () => {
    const result = render(
      <AppScaffold
        backEnabled
        hintRows={3}
        routeLayout={
          <Text>{Array.from({ length: 20 }, () => 'Output').join('\n')}</Text>
        }
        routeLayoutRows={6}
        terminalColumns={80}
        terminalRows={12}
        title="Update Global Framework"
        titleRows={3}
      />,
    );

    expect(result.lastFrame()?.split('\n')).toHaveLength(12);
    expect(result.lastFrame()).toContain(
      "Spec N' Roll · Update Global Framework",
    );
    expect(result.lastFrame()).toContain('Page Up/Down scroll · Esc back');
  });
  it('reloads only after Escape returns from a completed global update', async () => {
    const reloadRuntime = vi.fn();
    const session: RuntimeUiSession = {
      mode: 'global',
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      cwd: '/workspace/project',
      projectFound: false,
      projectExists: () => false,
      initializeProject: () => undefined,
      updateProjectFramework: () => undefined,
      projectUpdate: { enabled: false, disabledReason: 'No project update.' },
      updateGlobalFramework: async (output) =>
        output.write('Updated framework.'),
      reloadRuntime,
      globalUpdate: { enabled: true },
      listAgents: async () => [],
    };
    const result = render(<RuntimeUiApp session={session} />);

    result.stdin.write('\u001B[B');
    await new Promise<void>((resolve) => setImmediate(resolve));
    result.stdin.write('\r');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(result.lastFrame()).toContain('Update completed. Press Esc');
    expect(reloadRuntime).not.toHaveBeenCalled();

    result.stdin.write('\u001B');
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    expect(result.lastFrame()).toContain("Spec N' Roll · Home");
    expect(reloadRuntime).toHaveBeenCalledTimes(1);
  });
  it('renders action content above its selection list', () => {
    const result = render(
      <ActionLayout
        actions={[{ id: 'update', label: 'Update Framework' }]}
        content={<Text>Framework details</Text>}
        onActionSelect={() => undefined}
        rows={8}
      />,
    );

    expect(result.lastFrame()).toContain('Framework details');
    expect(result.lastFrame()).toContain('Update Framework');
  });

  it('uses every allocated row for the latest console page and renders a scrollbar', () => {
    const result = render(
      <ConsoleLayout
        rows={4}
        output={'first\nsecond\nthird\nfourth\nfifth\nsixth'}
      />,
    );

    expect(result.lastFrame()?.split('\n')).toHaveLength(4);
    expect(result.lastFrame()).toContain('third');
    expect(result.lastFrame()).toContain('sixth');
    expect(result.lastFrame()).not.toContain('first');
    expect(result.lastFrame()).toContain('█');
  });

  it('moves the console scrollbar with page scrolling', async () => {
    const result = render(
      <ConsoleLayout
        rows={4}
        output={'first\nsecond\nthird\nfourth\nfifth\nsixth'}
      />,
    );

    result.stdin.write('\u001B[5~');
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(result.lastFrame()).toContain('first');
    expect(result.lastFrame()).not.toContain('sixth');
  });

  it('retains only the newest 9,999 console rows', () => {
    const history = new ConsoleHistory();
    const transcript = Array.from(
      { length: 10_000 },
      (_, index) => `${index}`,
    ).join('\n');

    const rows = history.rows(transcript);

    expect(rows).toHaveLength(ConsoleHistory.MAXIMUM_ROWS);
    expect(rows[0]).toBe('1');
    expect(rows.at(-1)).toBe('9999');
  });

  it('coalesces rapid console output into one visual update', () => {
    vi.useFakeTimers();
    const onFlush = vi.fn();
    const outputBuffer = new ConsoleOutputBuffer(onFlush);

    outputBuffer.write('first');
    outputBuffer.write(' second');

    expect(onFlush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(ConsoleOutputBuffer.FLUSH_INTERVAL_MS);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('first second');
  });
});
