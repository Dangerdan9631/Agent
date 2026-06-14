import { describe, expect, it } from 'vitest';

import {
  currentRoute,
  formatBreadcrumb,
  homeRouteIdFor,
  popRoute,
  pushRoute,
  ROOT_NAVIGATION_STACK_GLOBAL,
  ROOT_NAVIGATION_STACK_LOCAL,
  titleForRoute,
} from '../../../src/cli/ink/app/navigation.js';

describe('interactive navigation stack', () => {
  it('pushes routes with generated titles and preserves stack history', () => {
    const stack = pushRoute(ROOT_NAVIGATION_STACK_LOCAL, 'specs-list');
    const detailStack = pushRoute(stack, 'spec-detail', '001-active-checkout');

    expect(currentRoute(detailStack)).toBe('spec-detail');
    expect(detailStack.map((entry) => entry.title)).toEqual([
      'Local Home',
      'Task Specs',
      'Spec Detail',
    ]);
    expect(formatBreadcrumb(detailStack)).toBe(
      'Local Home > Task Specs > Spec Detail: 001-active-checkout',
    );
  });

  it('pops child routes but never removes the instance home root', () => {
    const stack = pushRoute(pushRoute(ROOT_NAVIGATION_STACK_GLOBAL, 'setup-menu'), 'setup-version');

    expect(currentRoute(popRoute(stack))).toBe('setup-menu');
    expect(popRoute(ROOT_NAVIGATION_STACK_LOCAL)).toEqual(ROOT_NAVIGATION_STACK_LOCAL);
  });

  it('returns stable titles for every foundational route target', () => {
    expect(homeRouteIdFor('global')).toBe('global-home');
    expect(homeRouteIdFor('local')).toBe('local-home');
    expect(titleForRoute('global-home')).toBe('Global Home');
    expect(titleForRoute('local-home')).toBe('Local Home');
    expect(titleForRoute('workflows-list')).toBe('Workflows');
    expect(titleForRoute('agents-list')).toBe('Agents');
    expect(titleForRoute('project-metadata-view')).toBe('Project Metadata');
    expect(titleForRoute('setup-menu')).toBe('Setup');
  });
});
