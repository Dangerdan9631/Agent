import { describe, expect, it } from 'vitest';

import { areaLabel } from '../../../src/areas/area-03/index.js';

describe('area-03', () => {
  it('exposes the area label', () => {
    expect(areaLabel()).toBe('area-03');
  });
});
