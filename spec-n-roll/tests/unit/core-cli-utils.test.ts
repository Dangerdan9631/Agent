import { describe, expect, it } from 'vitest';

import { parseCommaSeparatedAgentList } from '../../src/cli/commands/core-cli-utils.js';

describe('parseCommaSeparatedAgentList', () => {
  it('returns an empty list for blank input', () => {
    expect(parseCommaSeparatedAgentList(undefined)).toEqual([]);
    expect(parseCommaSeparatedAgentList('')).toEqual([]);
    expect(parseCommaSeparatedAgentList('   ')).toEqual([]);
  });

  it('parses, trims, and de-duplicates comma-separated agent ids', () => {
    expect(parseCommaSeparatedAgentList('cursor, claude-code,cursor')).toEqual([
      'cursor',
      'claude-code',
    ]);
  });
});
