import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { CerebrateRegistry } from '../../src/application/cerebrate-registry.js';

describe('CerebrateRegistry', () => {
  it('stores, retrieves, and removes cerebrates by name', () => {
    const registry = new CerebrateRegistry<{ name: string }>();
    const alpha = { name: 'alpha' };

    registry.add(alpha);

    expect(registry.has('alpha')).toBe(true);
    expect(registry.get('alpha')).toBe(alpha);
    expect(registry.values()).toEqual([alpha]);
    expect(registry.remove('alpha')).toBe(alpha);
    expect(registry.get('alpha')).toBeUndefined();
  });

  it('rejects duplicate cerebrate names', () => {
    const registry = new CerebrateRegistry<{ name: string }>();

    registry.add({ name: 'alpha' });

    expect(() => registry.add({ name: 'alpha' })).toThrow(
      'Cerebrate "alpha" is already registered.',
    );
  });
});
