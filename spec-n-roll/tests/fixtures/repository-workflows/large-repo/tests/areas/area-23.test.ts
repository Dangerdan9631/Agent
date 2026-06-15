import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-23/index.js';

describe('area-23', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-23');
  });
});
