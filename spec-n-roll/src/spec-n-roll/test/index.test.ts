import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('spec-n-roll dispatcher executable', () => {
  it('has a placeholder test', () => {
    expect(true).toBe(true);
  });

  it('publishes the workspace root command shim to the dispatcher package', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../package.json'), 'utf8'),
    ) as { bin?: Record<string, string> };

    expect(packageJson.bin).toEqual({
      'spec-n-roll': './src/spec-n-roll/dist/index.js',
      snr: './src/spec-n-roll/dist/index.js',
    });
  });
});
