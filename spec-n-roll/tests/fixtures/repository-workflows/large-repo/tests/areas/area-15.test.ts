import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-15/index.js';

describe('area-15', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-15');
  });
});
