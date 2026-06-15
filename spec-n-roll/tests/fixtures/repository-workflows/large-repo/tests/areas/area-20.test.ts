import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-20/index.js';

describe('area-20', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-20');
  });
});
