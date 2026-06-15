import { describe, expect, it, vi } from 'vitest';

import {
  exitOnCoreError,
  parseCommaSeparatedAgentList,
} from '../../src/cli/commands/core-cli-utils.js';
import type { Logger } from '../../src/sdk/logging/index.js';

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

describe('exitOnCoreError', () => {
  it('logs Error messages and exits with code 1', () => {
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      logLevel: vi.fn(),
      create: vi.fn(),
    };
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    expect(() => exitOnCoreError(new Error('mutation failed'), logger)).toThrow('exit');
    expect(logger.error).toHaveBeenCalledWith('mutation failed');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
