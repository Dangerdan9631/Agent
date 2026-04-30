import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.unmock('node:fs');
  vi.unmock('node:path');
});

describe('config edge branches', () => {
  it('returns null when dirname does not make upward progress', async () => {
    vi.doMock('node:path', async () => {
      const actual = await vi.importActual<typeof import('node:path')>('node:path');

      return {
        ...actual,
        resolve: () => '/virtual/work',
        parse: () => ({ root: '/virtual-root', dir: '', base: '', ext: '', name: '' }),
        dirname: () => '/virtual/work',
      };
    });

    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');

      return {
        ...actual,
        existsSync: () => false,
      };
    });

    const { findConfigDir } = await import('../../src/config');

    expect(findConfigDir('/virtual/work')).toBeNull();
  });
});