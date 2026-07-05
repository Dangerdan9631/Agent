import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-04/index.js';

describe('area-04', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-04');
  });
});
