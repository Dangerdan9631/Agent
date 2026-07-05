import { describe, expect, it } from 'vitest';
import { ExpectedPackageNames } from 'spec-n-roll-test';
import { SpecNRollSdk } from '#sdk/index.js';

describe('SpecNRollSdk', () => {
  it('returns stub package names', () => {
    const sdk = new SpecNRollSdk();
    const expectedPackageNames = new ExpectedPackageNames();

    expect(sdk.name()).toBe(expectedPackageNames.runtime);
    expect(sdk.mcpName()).toBe(expectedPackageNames.mcp);
  });
});
