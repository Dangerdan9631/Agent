import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-14/index.js';

describe('area-14', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-14');
  });
});
