import { render } from 'ink-testing-library';
import React, { useMemo, useState } from 'react';
import { Text } from 'ink';
import { describe, expect, it } from 'vitest';

import {
  allocateRouteContentLayout,
  type ContextContentState,
} from '../../../src/cli/ink/components/ContextContent.js';
import { RouteContentLayout } from '../../../src/cli/ink/components/RouteContentLayout.js';
import {
  SelectableList,
  type SelectableListItem,
} from '../../../src/cli/ink/components/SelectableList.js';
import { useSelectionRowContribution } from '../../../src/cli/ink/components/SelectionRegion.js';

/**
 * Sets the process stdout column count for Ink test renders.
 *
 * @param columns - Positive terminal column count to expose during the test.
 * @returns Cleanup callback that restores the previous descriptor.
 */
function setTerminalColumns(columns: number): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
  Object.defineProperty(process.stdout, 'columns', {
    configurable: true,
    value: columns,
  });

  return () => {
    if (descriptor == null) {
      Reflect.deleteProperty(process.stdout, 'columns');
      return;
    }

    Object.defineProperty(process.stdout, 'columns', descriptor);
  };
}

/**
 * Escape sequence for the terminal down-arrow key.
 */
const DOWN_ARROW = '\u001B[B';

/**
 * Waits briefly for Ink effects and row reporting to settle.
 *
 * @returns Promise that resolves after one test render window.
 */
async function waitForFrame(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

/**
 * Test list item with read-only context metadata.
 */
interface TestListItem extends SelectableListItem {
  /**
   * Marker value used to confirm the focused row in assertions.
   */
  value: string;
}

/**
 * Renders option labels that report a fixed row contribution for layout tests.
 */
function ReportingSelectionList(props: {
  items: readonly TestListItem[];
  reportedRows: number;
}): React.ReactElement {
  useSelectionRowContribution(props.reportedRows);

  return React.createElement(
    React.Fragment,
    null,
    props.items.map((item) => React.createElement(Text, { key: item.id }, item.label)),
  );
}

/**
 * Renders RouteContentLayout with focus-driven context state for interaction tests.
 */
function FocusTrackingRouteLayout(props: {
  routeContentRows: number;
  items: readonly TestListItem[];
}): React.ReactElement {
  const [selectedContext, setSelectedContext] = useState(props.items[0]?.context);
  const contextState = useMemo(
    (): ContextContentState => ({
      routeTitle: 'Test Route',
      fallbackSummary: 'Choose an option.',
      selectedContext,
    }),
    [selectedContext],
  );

  return React.createElement(RouteContentLayout, {
    routeContentRows: props.routeContentRows,
    contextState,
    selection: React.createElement(SelectableList, {
      items: props.items,
      onFocusChange: (item) => setSelectedContext(item?.context),
      onSelect: () => undefined,
    }),
  });
}

describe('route content layout allocation', () => {
  it('assigns remaining route slot rows to the content sub-region', () => {
    expect(
      allocateRouteContentLayout({
        routeContentRows: 14,
        selectionRows: 5,
        minimumContentRows: 1,
      }),
    ).toEqual({
      routeContentRows: 14,
      minimumRows: 6,
      contentRows: 9,
      selectionRows: 5,
      minimumSize: false,
    });
  });

  it('grows content rows when selection rows shrink', () => {
    const manyOptions = allocateRouteContentLayout({
      routeContentRows: 12,
      selectionRows: 8,
      minimumContentRows: 1,
    });
    const fewOptions = allocateRouteContentLayout({
      routeContentRows: 12,
      selectionRows: 3,
      minimumContentRows: 1,
    });

    expect(fewOptions.contentRows).toBeGreaterThan(manyOptions.contentRows);
    expect(fewOptions.selectionRows).toBeLessThan(manyOptions.selectionRows);
    expect(fewOptions.contentRows + fewOptions.selectionRows).toBe(
      manyOptions.contentRows + manyOptions.selectionRows,
    );
  });

  it('reports minimum-size state without negative content rows', () => {
    expect(
      allocateRouteContentLayout({
        routeContentRows: 4,
        selectionRows: 5,
        minimumContentRows: 1,
      }),
    ).toMatchObject({
      minimumRows: 6,
      contentRows: 0,
      minimumSize: true,
    });
  });
});

describe('RouteContentLayout component', () => {
  const contextState: ContextContentState = {
    routeTitle: 'Task Specs',
    fallbackSummary: 'Browse known task specifications.',
    selectedContext: {
      id: 'spec-alpha',
      title: 'Spec Alpha',
      summary: 'Implements the alpha workflow for interactive validation.',
      details: ['3 tasks incomplete', '2 workflow variants available'],
    },
  };

  const threeItems: TestListItem[] = [
    {
      id: 'one',
      label: '1 First',
      value: 'one',
      context: { id: 'one', title: 'First', summary: 'First option summary.' },
    },
    {
      id: 'two',
      label: '2 Second',
      value: 'two',
      context: { id: 'two', title: 'Second', summary: 'Second option summary.' },
    },
    {
      id: 'three',
      label: '3 Third',
      value: 'three',
      context: { id: 'three', title: 'Third', summary: 'Third option summary.' },
    },
  ];

  const sevenItems: TestListItem[] = [
    ...threeItems,
    {
      id: 'four',
      label: '4 Fourth',
      value: 'four',
      context: { id: 'four', title: 'Fourth', summary: 'Fourth option summary.' },
    },
    {
      id: 'five',
      label: '5 Fifth',
      value: 'five',
      context: { id: 'five', title: 'Fifth', summary: 'Fifth option summary.' },
    },
    {
      id: 'six',
      label: '6 Sixth',
      value: 'six',
      context: { id: 'six', title: 'Sixth', summary: 'Sixth option summary.' },
    },
    {
      id: 'seven',
      label: '7 Seventh',
      value: 'seven',
      context: { id: 'seven', title: 'Seventh', summary: 'Seventh option summary.' },
    },
  ];

  it('sizes the selection list to the visible option row budget', async () => {
    const fewOptions = render(
      React.createElement(RouteContentLayout, {
        routeContentRows: 12,
        contextState,
        selection: React.createElement(ReportingSelectionList, {
          items: threeItems,
          reportedRows: 3,
        }),
      }),
    );
    await waitForFrame();
    const fewFrame = fewOptions.lastFrame() ?? '';
    const fewSelectionLabels = ['1 First', '2 Second', '3 Third'].filter((label) =>
      fewFrame.includes(label),
    ).length;
    fewOptions.unmount();

    const manyOptions = render(
      React.createElement(RouteContentLayout, {
        routeContentRows: 12,
        contextState,
        selection: React.createElement(ReportingSelectionList, {
          items: sevenItems,
          reportedRows: 7,
        }),
      }),
    );
    await waitForFrame();
    const manyFrame = manyOptions.lastFrame() ?? '';
    const manySelectionLabels = [
      '1 First',
      '2 Second',
      '3 Third',
      '4 Fourth',
      '5 Fifth',
      '6 Sixth',
      '7 Seventh',
    ].filter((label) => manyFrame.includes(label)).length;
    manyOptions.unmount();

    expect(manySelectionLabels).toBeGreaterThan(fewSelectionLabels);
    expect(manyFrame).toContain('7 Seventh');
    expect(fewFrame).not.toContain('7 Seventh');
  });

  it('fills the content area with leftover route slot rows', async () => {
    const allocation = allocateRouteContentLayout({
      routeContentRows: 10,
      selectionRows: 3,
      minimumContentRows: 1,
    });

    const app = render(
      React.createElement(RouteContentLayout, {
        routeContentRows: 10,
        contextState,
        selection: React.createElement(ReportingSelectionList, {
          items: threeItems,
          reportedRows: allocation.selectionRows,
        }),
      }),
    );

    await waitForFrame();
    const frame = app.lastFrame() ?? '';

    expect(frame).toContain('Spec Alpha');
    expect(frame).toContain('Implements the alpha workflow');
    expect(frame).toContain('2 workflow variants available');

    app.unmount();
  });

  it('spans the selection list border across the full terminal width', async () => {
    const columns = 60;
    const restoreColumns = setTerminalColumns(columns);
    const app = render(
      React.createElement(RouteContentLayout, {
        routeContentRows: 10,
        contextState,
        selection: React.createElement(SelectableList, {
          items: threeItems,
          onSelect: () => undefined,
        }),
      }),
    );

    await waitForFrame();
    const frame = app.lastFrame() ?? '';
    const lines = frame.split('\n');
    const firstOptionIndex = lines.findIndex((line) => line.includes('1 First'));
    const selectionTopBorder = lines
      .slice(0, firstOptionIndex)
      .reverse()
      .find((line) => line.startsWith('┌') && line.endsWith('┐'));

    expect(selectionTopBorder?.length).toBe(columns);

    app.unmount();
    restoreColumns();
  });

  it('sizes the selection list vertically to its option rows without extra blank lines', async () => {
    const app = render(
      React.createElement(RouteContentLayout, {
        routeContentRows: 14,
        contextState,
        selection: React.createElement(SelectableList, {
          items: threeItems,
          onSelect: () => undefined,
        }),
      }),
    );

    await waitForFrame();
    const frame = app.lastFrame() ?? '';
    const lines = frame.split('\n');
    const firstOptionIndex = lines.findIndex((line) => line.includes('1 First'));
    const lastOptionIndex = lines.findIndex((line) => line.includes('3 Third'));
    const selectionBottomBorderIndex = lines.findIndex(
      (line, index) => index > lastOptionIndex && line.startsWith('└'),
    );

    expect(firstOptionIndex).toBeGreaterThanOrEqual(0);
    expect(lastOptionIndex).toBe(firstOptionIndex + 2);
    expect(selectionBottomBorderIndex).toBe(lastOptionIndex + 1);

    app.unmount();
  });

  it('updates focused content without changing the outer frame height', async () => {
    const app = render(
      React.createElement(FocusTrackingRouteLayout, {
        routeContentRows: 14,
        items: threeItems,
      }),
    );

    await waitForFrame();
    const initialFrame = app.lastFrame() ?? '';
    const initialLineCount = initialFrame.split('\n').length;

    expect(initialFrame).toContain('First');
    expect(initialFrame).toContain('First option summary.');

    app.stdin.write(DOWN_ARROW);
    await waitForFrame();

    const focusedFrame = app.lastFrame() ?? '';
    expect(focusedFrame.split('\n').length).toBe(initialLineCount);
    expect(focusedFrame).toContain('Second');
    expect(focusedFrame).toContain('Second option summary.');
    expect(focusedFrame).not.toContain('First option summary.');

    app.unmount();
  });
});
