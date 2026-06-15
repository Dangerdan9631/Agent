import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-17/index.js';

describe('area-17', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-17');
  });
});
