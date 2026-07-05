import { describe, expect, it } from 'vitest';
import { filesOfProject } from 'tsarch';

describe('workspace architecture tests', () => {
  it('keeps the SDK stub cycle free', async () => {
    const violations = await filesOfProject('src/spec-n-roll-sdk/tsconfig.json')
      .inFolder('src')
      .should()
      .beFreeOfCycles()
      .check();

    expect(violations).toEqual([]);
  });
});
