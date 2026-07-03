import { describe, expect, it } from 'vitest';

import { parseDispatcherArgs } from '../../src/dispatcher/index.js';

describe('interactive dispatcher launch routing', () => {
  it('selects Ink for bare invocation', () => {
    expect(parseDispatcherArgs([]).args).toHaveLength(0);
  });

  it('keeps explicit commands on the non-interactive CLI path', () => {
    expect(parseDispatcherArgs(['init', '--help']).args).toHaveLength(2);
  });

  it('treats global-only invocation as bare interactive after flag stripping', () => {
    const { args } = parseDispatcherArgs(['--global']);

    expect(args).toHaveLength(0);
  });
});
