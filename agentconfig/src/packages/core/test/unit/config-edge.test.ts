import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('node:fs');
  vi.doUnmock('node:path');
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

    const { ConfigRepository } = await import('../../src/infrastructure/config-repository');

    expect(new ConfigRepository().findConfigDir('/virtual/work')).toBeNull();
  });
});
