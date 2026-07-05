import { describe, expect, it } from 'vitest';
import type { RuntimeInvocation, RuntimeTarget } from '../src/index.js';

describe('spec-n-roll-api contracts', () => {
  it('describes runtime invocation payloads without implementing behavior', () => {
    const invocation: RuntimeInvocation = { argv: ['plan'] };
    const target: RuntimeTarget = {
      packageName: 'spec-n-roll-runtime',
      commandName: 'spec-n-roll-runtime',
    };

    expect(invocation.argv).toEqual(['plan']);
    expect(target.commandName).toBe('spec-n-roll-runtime');
  });
});
