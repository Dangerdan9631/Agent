import { describe, expect, it } from 'vitest';
import { DEFAULT_PIPE_NAME, getDefaultOvermindPipePath } from '../../src/constants.js';
import { OvermindService } from '../../src/service.js';

describe('OvermindService', () => {
  it('reports service stats', async () => {
    const service = new OvermindService();

    await expect(service.getServiceStats({})).resolves.toEqual({
      uptime: expect.any(Number),
    });
  });

  it('returns a shutdown acknowledgement', async () => {
    const service = new OvermindService();

    await expect(service.shutdown({})).resolves.toEqual({
      success: true,
      message: 'Service shutdown requested.',
    });
  });
});

describe('getDefaultOvermindPipePath', () => {
  it('uses the default pipe name', () => {
    expect(getDefaultOvermindPipePath()).toContain(DEFAULT_PIPE_NAME);
  });

  it('accepts a custom pipe name', () => {
    expect(getDefaultOvermindPipePath('custom-overmind')).toContain('custom-overmind');
  });
});
