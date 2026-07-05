import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-18/index.js';

describe('area-18', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-18');
  });
});
