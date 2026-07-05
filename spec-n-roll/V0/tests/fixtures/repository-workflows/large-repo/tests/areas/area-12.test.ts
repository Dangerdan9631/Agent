import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-12/index.js';

describe('area-12', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-12');
  });
});
