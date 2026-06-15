import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-11/index.js';

describe('area-11', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-11');
  });
});
