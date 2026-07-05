import { describe, expect, it } from 'vitest';
import { createCliArgs, expectedPackageNames } from '../src/index.js';

describe('spec-n-roll-test fixtures', () => {
  it('provides expected stub package names', () => {
    expect(expectedPackageNames.dispatcher).toBe('spec-n-roll');
  });

  it('creates normalized cli arguments', () => {
    expect(createCliArgs('a', 'b')).toEqual(['a', 'b']);
  });

  it('has a placeholder executable test', () => {
    expect(true).toBe(true);
  });
});
