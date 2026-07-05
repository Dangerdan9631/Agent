import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-06/index.js';

describe('area-06', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-06');
  });
});
