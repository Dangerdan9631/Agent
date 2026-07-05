import { describe, expect, it } from 'vitest';

import { Dispatcher } from '../../src/dispatcher/dispatcher.js';

describe('dispatcher launch routing', () => {
  it('requires a root path when --root is present', () => {
    expect(() => new Dispatcher().run(['--root'])).toThrow(/requires a directory path/);
  });
});
