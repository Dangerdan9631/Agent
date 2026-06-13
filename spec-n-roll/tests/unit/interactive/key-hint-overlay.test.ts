import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { KEY_HINT_REGION_ROWS } from '../../../src/cli/ink/components/ContextContent.js';
import { KeyHintOverlay } from '../../../src/cli/ink/components/KeyHintOverlay.js';

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

describe('key hint overlay layout', () => {
  it('centers the hint group horizontally within the overlay region', () => {
    const columns = 80;
    const restoreColumns = setTerminalColumns(columns);
    const app = render(React.createElement(KeyHintOverlay, { visible: true }));
    const frame = app.lastFrame() ?? '';
    const hintLine = frame.split('\n').find((line) => line.includes('q quit')) ?? '';
    const hintText = hintLine.trim();
    const leadingSpaces = hintLine.length - hintLine.trimStart().length;
    const expectedLeading = Math.floor((columns - hintText.length) / 2);

    expect(leadingSpaces).toBeGreaterThan(0);
    expect(leadingSpaces).toBe(expectedLeading);

    app.unmount();
    restoreColumns();
  });

  it('merges supplemental hints after global defaults', () => {
    const app = render(
      React.createElement(KeyHintOverlay, {
        visible: true,
        supplementalHints: [{ key: '1-5', label: 'jump' }],
      }),
    );

    expect(app.lastFrame()).toContain('q quit');
    expect(app.lastFrame()).toContain('1-5 jump');

    app.unmount();
  });

  it('renders nothing when hints are hidden', () => {
    const app = render(React.createElement(KeyHintOverlay, { visible: false }));

    expect(app.lastFrame()).toBe('');

    app.unmount();
  });

  it('renders a single hint row without extra vertical padding', () => {
    const app = render(React.createElement(KeyHintOverlay, { visible: true }));
    const lineCount = (app.lastFrame() ?? '').split('\n').length;

    expect(lineCount).toBe(KEY_HINT_REGION_ROWS);

    app.unmount();
  });
});
