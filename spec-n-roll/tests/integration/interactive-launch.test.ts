import { describe, expect, it } from 'vitest';

import { selectDispatchRuntimeMode, stripGlobalFlag } from '../../src/dispatcher/index.js';

describe('interactive dispatcher launch routing', () => {
  it('selects Ink for bare invocation', () => {
    expect(selectDispatchRuntimeMode([])).toBe('interactive');
  });

  it('keeps explicit commands on the non-interactive CLI path', () => {
    expect(selectDispatchRuntimeMode(['init', '--help'])).toBe('non-interactive');
  });

  it('treats global-only invocation as bare interactive after flag stripping', () => {
    const { args } = stripGlobalFlag(['--global']);

    expect(selectDispatchRuntimeMode(args)).toBe('interactive');
  });
});
