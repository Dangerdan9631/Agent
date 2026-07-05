import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-10/index.js';

describe('area-10', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-10');
  });
});
