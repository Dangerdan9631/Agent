import { describe, expect, it } from 'vitest';

import {
  currentRoute,
  formatBreadcrumb,
  popRoute,
  pushRoute,
  ROOT_NAVIGATION_STACK,
  titleForRoute,
} from '../../../src/cli/ink/app/navigation.js';

describe('interactive navigation stack', () => {
  it('pushes routes with generated titles and preserves stack history', () => {
    const stack = pushRoute(ROOT_NAVIGATION_STACK, 'specs-list');
    const detailStack = pushRoute(stack, 'spec-detail', '001-active-checkout');

    expect(currentRoute(detailStack)).toBe('spec-detail');
    expect(detailStack.map((entry) => entry.title)).toEqual([
      'Main Menu',
      'Task Specs',
      'Spec Detail',
    ]);
    expect(formatBreadcrumb(detailStack)).toBe(
      'Main Menu > Task Specs > Spec Detail: 001-active-checkout',
    );
  });

  it('pops child routes but never removes the main menu root', () => {
    const stack = pushRoute(pushRoute(ROOT_NAVIGATION_STACK, 'setup-menu'), 'setup-version');

    expect(currentRoute(popRoute(stack))).toBe('setup-menu');
    expect(popRoute(ROOT_NAVIGATION_STACK)).toEqual(ROOT_NAVIGATION_STACK);
  });

  it('returns stable titles for every foundational route target', () => {
    expect(titleForRoute('main-menu')).toBe('Main Menu');
    expect(titleForRoute('workflows-list')).toBe('Workflows');
    expect(titleForRoute('agents-list')).toBe('Agents');
    expect(titleForRoute('project-metadata-view')).toBe('Project');
    expect(titleForRoute('setup-menu')).toBe('Setup');
  });
});
