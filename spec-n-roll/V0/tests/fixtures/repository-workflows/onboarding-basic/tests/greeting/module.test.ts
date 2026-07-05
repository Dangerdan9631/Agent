import * as greeting from '../../../src/greeting/index.js';

describe('greeting module', () => {
  it('re-exports greet from the public module entry', () => {
    expect(typeof greeting.greet).toBe('function');
  });
});
