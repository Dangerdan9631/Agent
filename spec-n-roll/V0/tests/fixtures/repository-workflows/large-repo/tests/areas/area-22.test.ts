import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-22/index.js';

describe('area-22', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-22');
  });
});
