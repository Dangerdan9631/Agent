import { describe, expect, it } from 'vitest';
import { expectedPackageNames } from 'spec-n-roll-test';
import { SpecNRollSdk } from '../src/index.js';

describe('SpecNRollSdk', () => {
  it('returns stub package names', () => {
    const sdk = new SpecNRollSdk();

    expect(sdk.name()).toBe(expectedPackageNames.runtime);
    expect(sdk.mcpName()).toBe(expectedPackageNames.mcp);
  });
});
