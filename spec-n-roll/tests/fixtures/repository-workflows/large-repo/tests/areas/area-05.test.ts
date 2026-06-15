import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-05/index.js';

describe('area-05', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-05');
  });
});
