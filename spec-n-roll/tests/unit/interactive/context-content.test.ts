import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  buildContextContentLines,
  buildScrollbarTrack,
  ContextContent,
  scrollContextLines,
  type ContextContentState,
} from '../../../src/cli/ink/components/ContextContent.js';
import {
  SelectableList,
  type SelectableListItem,
} from '../../../src/cli/ink/components/SelectableList.js';

describe('context content', () => {
  const context: ContextContentState = {
    routeTitle: 'Task Specs',
    fallbackSummary: 'Browse known task specifications.',
    selectedContext: {
      id: 'spec-alpha',
      title: 'Spec Alpha',
      summary: 'Implements the alpha workflow for interactive validation.',
      status: 'Ready for implementation',
      warnings: ['Missing quickstart validation'],
      nextStep: 'Open details',
      details: ['3 tasks incomplete', '2 workflow variants available'],
    },
  };

  it('renders context lines in priority order before lower-priority details', () => {
    expect(buildContextContentLines(context)).toEqual([
      'Spec Alpha',
      'Warning: Missing quickstart validation',
      'Status: Ready for implementation',
      'Implements the alpha workflow for interactive validation.',
      'Next: Open details',
      '3 tasks incomplete',
      '2 workflow variants available',
    ]);
  });

  it('keeps the full line list available for scrolling instead of clipping by row budget', () => {
    expect(buildContextContentLines({ ...context, availableRows: 3 })).toEqual(
      buildContextContentLines(context),
    );
  });

  it('uses fallback route context when no selected option context exists', () => {
    expect(
      buildContextContentLines({
        routeTitle: 'Workflows',
        fallbackSummary: 'Review workflow variants.',
        availableRows: 2,
      }),
    ).toEqual(['Workflows', 'Review workflow variants.']);
  });

  it('scrolls the context viewport one line at a time', () => {
    const lines = buildContextContentLines(context);

    expect(scrollContextLines(lines, 3, 0)).toMatchObject({
      visibleLines: lines.slice(0, 3),
      scrollOffset: 0,
      hasOverflow: true,
    });
    expect(scrollContextLines(lines, 3, 1)).toMatchObject({
      visibleLines: lines.slice(1, 4),
      scrollOffset: 1,
      hasOverflow: true,
    });
  });

  it('builds a scrollbar track when content overflows the viewport', () => {
    expect(buildScrollbarTrack(4, 8, 0)).toEqual(['█', '█', '│', '│']);
    expect(buildScrollbarTrack(4, 8, 4)).toEqual(['│', '│', '█', '█']);
  });

  it('renders visible text with a scrollbar when content exceeds the allocated rows', () => {
    const app = render(
      React.createElement(ContextContent, { state: { ...context, availableRows: 4 } }),
    );
    const frame = app.lastFrame() ?? '';

    expect(frame).toContain('Spec Alpha');
    expect(frame).toContain('Warning: Missing quickstart validation');
    expect(frame).toContain('Status: Ready for implementation');
    expect(frame).toContain('Implements the alpha workflow');
    expect(frame).toContain('█');
    expect(frame).not.toContain('Next: Open details');
    app.unmount();
  });
});

/**
 * Waits briefly for Ink input handling and effects to settle.
 *
 * @returns Promise that resolves after one terminal render update window.
 */
async function waitForFrame(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

describe('selectable list context focus', () => {
  interface TestItem extends SelectableListItem {
    /**
     * Test-only marker used to confirm activation still returns the selected row.
     */
    value: string;
  }

  const items: TestItem[] = [
    {
      id: 'first',
      label: 'First',
      value: 'first-value',
      context: {
        id: 'first',
        title: 'First option',
        summary: 'The first option is focused by default.',
      },
    },
    {
      id: 'second',
      label: 'Second',
      value: 'second-value',
      context: {
        id: 'second',
        title: 'Second option',
        summary: 'The second option receives focus after moving down.',
      },
    },
  ];

  it('reports focus changes without invoking selection', async () => {
    const focusedIds: Array<string | undefined> = [];
    const selectedIds: string[] = [];
    const app = render(
      React.createElement(SelectableList<TestItem>, {
        items,
        onFocusChange: (item) => focusedIds.push(item?.id),
        onSelect: (item) => selectedIds.push(item.id),
      }),
    );

    await waitForFrame();
    app.stdin.write('\u001B[B');
    await waitForFrame();

    expect(focusedIds).toContain('first');
    expect(focusedIds).toContain('second');
    expect(selectedIds).toEqual([]);
    app.unmount();
  });

  it('keeps Enter activation separate from context metadata', async () => {
    const selectedIds: string[] = [];
    const app = render(
      React.createElement(SelectableList<TestItem>, {
        items,
        onSelect: (item) => selectedIds.push(item.id),
      }),
    );

    await waitForFrame();
    app.stdin.write('\r');
    await waitForFrame();

    expect(selectedIds).toEqual(['first']);
    app.unmount();
  });
});
