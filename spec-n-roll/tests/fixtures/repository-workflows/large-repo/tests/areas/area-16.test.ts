import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-16/index.js';

describe('area-16', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-16');
  });
});
