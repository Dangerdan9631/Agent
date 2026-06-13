import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { KeyHintOverlay } from '../../../../src/cli/ink/components/KeyHintOverlay.js';
import { scrollWindowStartIntoView } from '../../../../src/cli/ink/components/SelectableList.js';

describe('keyboard interaction components', () => {
  it('scrolls the selected list item into view when the viewport is constrained', () => {
    expect(scrollWindowStartIntoView(0, 0, 2)).toBe(0);
    expect(scrollWindowStartIntoView(0, 2, 2)).toBe(1);
    expect(scrollWindowStartIntoView(3, 2, 2)).toBe(2);
  });

  it('renders global key hints only when visible', () => {
    const hidden = render(React.createElement(KeyHintOverlay, { visible: false }));
    expect(hidden.lastFrame()).not.toContain('q quit');
    hidden.unmount();

    const visible = render(React.createElement(KeyHintOverlay, { visible: true }));
    expect(visible.lastFrame()).toContain('q quit');
    expect(visible.lastFrame()).toContain('Enter select');
    visible.unmount();
  });
});
