import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-21/index.js';

describe('area-21', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-21');
  });
});
