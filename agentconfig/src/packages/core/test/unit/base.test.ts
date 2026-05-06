import { describe, expect, it } from 'vitest';
import { buildFrontmatter, buildInTextCondition, filterForTarget } from '../../src/built-in-plugins/base';

describe('generator base helpers', () => {
  it('keeps items without target filters', () => {
    const items = [{ name: 'all' }, { name: 'copilot-only', targets: ['copilot'] }];

    expect(filterForTarget(items, 'copilot')).toContainEqual({ name: 'all' });
  });

  it('keeps items whose targets include the current target', () => {
    const items = [
      { name: 'copilot-only', targets: ['copilot'] },
      { name: 'cursor-only', targets: ['cursor'] },
    ];

    expect(filterForTarget(items, 'copilot')).toEqual([{ name: 'copilot-only', targets: ['copilot'] }]);
  });

  it('drops items whose excludedTargets include the current target', () => {
    const items = [{ name: 'all' }, { name: 'not-copilot', excludedTargets: ['copilot'] }];

    expect(filterForTarget(items, 'copilot')).toEqual([{ name: 'all' }]);
  });

  it('builds frontmatter arrays one item per line', () => {
    expect(buildFrontmatter({ tags: ['one', 'two'] })).toBe([
      '---',
      'tags:',
      '  - "one"',
      '  - "two"',
      '---',
    ].join('\n'));
  });

  it('renders empty arrays in frontmatter', () => {
    expect(buildFrontmatter({ tags: [] })).toBe([
      '---',
      'tags: []',
      '---',
    ].join('\n'));
  });

  it('skips undefined and null frontmatter fields', () => {
    expect(buildFrontmatter({ present: 'value', missing: undefined, empty: null })).toBe([
      '---',
      'present: value',
      '---',
    ].join('\n'));
  });

  it('quotes YAML-unsafe strings in frontmatter', () => {
    expect(buildFrontmatter({ description: 'value: needs quoting' })).toBe([
      '---',
      'description: "value: needs quoting"',
      '---',
    ].join('\n'));
  });

  it('leaves YAML-safe strings unquoted in frontmatter', () => {
    expect(buildFrontmatter({ description: 'safe-value' })).toBe([
      '---',
      'description: safe-value',
      '---',
    ].join('\n'));
  });

  it('renders booleans in frontmatter', () => {
    expect(buildFrontmatter({ enabled: true })).toBe([
      '---',
      'enabled: true',
      '---',
    ].join('\n'));
  });

  it('renders numbers in frontmatter', () => {
    expect(buildFrontmatter({ retries: 2 })).toBe([
      '---',
      'retries: 2',
      '---',
    ].join('\n'));
  });

  it('adds in-text apply conditions', () => {
    expect(buildInTextCondition('working on migrations', 'Follow the checklist.')).toBe(
      '> **Apply only when:** working on migrations\n\nFollow the checklist.',
    );
  });
});