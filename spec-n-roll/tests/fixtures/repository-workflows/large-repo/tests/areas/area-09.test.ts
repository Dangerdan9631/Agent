import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-09/index.js';

describe('area-09', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-09');
  });
});
