import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-24/index.js';

describe('area-24', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-24');
  });
});
