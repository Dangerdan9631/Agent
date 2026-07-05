import { describe, expect, it } from 'vitest';
import {
  CliArgumentListFactory,
  ExpectedPackageNames,
} from '#test-support/index.js';

describe('spec-n-roll-test fixtures', () => {
  it('provides expected stub package names', () => {
    expect(new ExpectedPackageNames().dispatcher).toBe('spec-n-roll');
  });

  it('creates normalized cli arguments', () => {
    expect(new CliArgumentListFactory().create('a', 'b')).toEqual(['a', 'b']);
  });

  it('has a placeholder executable test', () => {
    expect(true).toBe(true);
  });
});
