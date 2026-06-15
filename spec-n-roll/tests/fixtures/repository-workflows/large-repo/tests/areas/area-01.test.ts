import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-01/index.js';

describe('area-01', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-01');
  });
});
