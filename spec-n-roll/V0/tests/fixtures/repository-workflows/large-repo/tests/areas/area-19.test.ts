import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-19/index.js';

describe('area-19', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-19');
  });
});
