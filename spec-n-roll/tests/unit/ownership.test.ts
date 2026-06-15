import { describe, expect, it } from 'vitest';

import { classifyPath } from '../../src/sdk/updates/ownership.js';

describe('classifyPath', () => {
  it('classifies toolkit-owned paths', () => {
    expect(classifyPath('.spec-n-roll/AGENTS.md')).toBe('toolkit');
    expect(classifyPath('.agents/skills/spec-n-roll/SKILL.md')).toBe('toolkit');
  });

  it('classifies user-owned paths', () => {
    expect(classifyPath('.spec-n-roll/config/workflow.config.json')).toBe('user');
    expect(classifyPath('specs/001-sample/spec.md')).toBe('user');
    expect(classifyPath('living-specs/auth.feature')).toBe('user');
  });

  it('returns null for paths outside known ownership roots', () => {
    expect(classifyPath('src/cli/index.ts')).toBeNull();
  });
});
