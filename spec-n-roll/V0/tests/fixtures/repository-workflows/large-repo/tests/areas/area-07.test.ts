import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-07/index.js';

describe('area-07', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-07');
  });
});
