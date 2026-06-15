import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-13/index.js';

describe('area-13', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-13');
  });
});
