import { beforeEach, describe, expect, it, vi } from 'vitest';

import { main, shouldLaunchInteractiveApp } from '../../src/cli/index.js';
import { launchInteractiveApp } from '../../src/cli/interactive/launch.js';

vi.mock('../../src/cli/interactive/launch.js', () => ({
  launchInteractiveApp: vi.fn().mockResolvedValue(undefined),
}));

describe('interactive CLI launch routing', () => {
  beforeEach(() => {
    vi.mocked(launchInteractiveApp).mockClear();
  });

  it('launches Ink for bare full CLI invocation', async () => {
    await main(['node', '/toolkit/dist/cli/index.js']);

    expect(launchInteractiveApp).toHaveBeenCalledWith({
      executedBinaryPath: '/toolkit/dist/cli/index.js',
    });
  });

  it('keeps init help on the non-interactive Commander path', () => {
    expect(shouldLaunchInteractiveApp(['init', '--help'])).toBe(false);
    expect(launchInteractiveApp).not.toHaveBeenCalled();
  });

  it('treats global-only invocation as bare interactive after flag stripping', async () => {
    await main(['node', '/toolkit/dist/cli/index.js', '--global']);

    expect(launchInteractiveApp).toHaveBeenCalledWith({
      executedBinaryPath: '/toolkit/dist/cli/index.js',
    });
  });
});
