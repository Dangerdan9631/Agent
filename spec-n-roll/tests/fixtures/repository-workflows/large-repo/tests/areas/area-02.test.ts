import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-02/index.js';

describe('area-02', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-02');
  });
});
