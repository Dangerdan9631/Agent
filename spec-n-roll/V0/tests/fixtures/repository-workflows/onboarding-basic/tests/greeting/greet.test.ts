import { describe, expect, it } from 'vitest';

import { greet } from '../../../src/greeting/greet.js';

describe('greet', () => {
  it('returns a greeting for a valid name', () => {
    expect(greet('Ada')).toBe('Hello, Ada');
  });

  it('rejects an empty name', () => {
    expect(() => greet('   ')).toThrow('Name is required');
  });
});
