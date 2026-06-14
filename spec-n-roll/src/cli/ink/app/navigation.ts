import type { VersionInvocationTarget } from '../../commands/version.js';

/**
 * Identifies every screen route handled by the interactive Ink application.
 */
export type RouteId =
  | 'global-home'
  | 'local-home'
  | 'project-hub'
  | 'manage-local'
  | 'specs-list'
  | 'spec-detail'
  | 'spec-mutations'
  | 'task-status-set'
  | 'task-checkbox-set'
  | 'workflow-state'
  | 'workflows-list'
  | 'workflow-detail'
  | 'agents-list'
  | 'agent-add'
  | 'agent-remove'
  | 'project-metadata-view'
  | 'project-metadata-edit'
  | 'setup-menu'
  | 'setup-init'
  | 'setup-version'
  | 'setup-update'
  | 'setup-step-instantiate'
  | 'setup-frontmatter-update';

/**
 * One entry in the in-memory navigation stack used for routing and breadcrumbs.
 */
export interface NavigationStackEntry {
  /**
   * Route identifier for the screen represented by this stack entry.
   */
  routeId: RouteId;
  /**
   * Short title shown in status breadcrumbs.
   */
  title: string;
  /**
   * Optional short qualifier such as a selected task spec label.
   */
  contextLabel?: string;
}

/**
 * One keyboard shortcut shown in the key hint overlay.
 */
export interface KeyHintDescriptor {
  /**
   * Key or key combo shown in the hint. Must be a non-empty display string.
   */
  key: string;
  /**
   * Short action label following the key. Must be a non-empty display string.
   */
  label: string;
}

/**
 * Optional supplemental hints merged with global defaults for specific routes.
 */
export const ROUTE_SUPPLEMENTAL_HINTS: Partial<
  Readonly<Record<RouteId, readonly KeyHintDescriptor[]>>
> = {};

/**
 * Human-readable route titles for breadcrumb and placeholder rendering.
 */
export const ROUTE_TITLES: Readonly<Record<RouteId, string>> = {
  'global-home': 'Main Menu',
  'local-home': 'Main Menu',
  'project-hub': 'Project',
  'manage-local': "Manage Spec N' Roll",
  'specs-list': 'Task Specs',
  'spec-detail': 'Spec Detail',
  'spec-mutations': 'Spec Mutations',
  'task-status-set': 'Set Task Status',
  'task-checkbox-set': 'Set Task Checkbox',
  'workflow-state': 'Workflow State',
  'workflows-list': 'Workflows',
  'workflow-detail': 'Workflow Detail',
  'agents-list': 'Agents',
  'agent-add': 'Add Agent',
  'agent-remove': 'Remove Agent',
  'project-metadata-view': 'Project Metadata',
  'project-metadata-edit': 'Edit Project Metadata',
  'setup-menu': 'Setup',
  'setup-init': 'Initialize Project',
  'setup-version': 'Version Info',
  'setup-update': 'Update Toolkit',
  'setup-step-instantiate': 'Instantiate Step',
  'setup-frontmatter-update': 'Update Frontmatter',
};

/**
 * Initial navigation stack for global CLI instances.
 */
export const ROOT_NAVIGATION_STACK_GLOBAL: readonly NavigationStackEntry[] = [
  { routeId: 'global-home', title: ROUTE_TITLES['global-home'] },
];

/**
 * Initial navigation stack for project-local CLI instances.
 */
export const ROOT_NAVIGATION_STACK_LOCAL: readonly NavigationStackEntry[] = [
  { routeId: 'local-home', title: ROUTE_TITLES['local-home'] },
];

/**
 * Returns the instance home route for the active CLI invocation target.
 *
 * @param invocation - Binary resolution context for the current CLI process.
 * @returns `local-home` for project-local sessions, otherwise `global-home`.
 */
export function homeRouteIdFor(invocation: VersionInvocationTarget): RouteId {
  return invocation === 'local' ? 'local-home' : 'global-home';
}

/**
 * Returns the navigation root stack for the active CLI invocation target.
 *
 * @param invocation - Binary resolution context for the current CLI process.
 * @returns Root navigation stack for the instance type.
 */
export function rootNavigationStackFor(
  invocation: VersionInvocationTarget,
): readonly NavigationStackEntry[] {
  return homeRouteIdFor(invocation) === 'local-home'
    ? ROOT_NAVIGATION_STACK_LOCAL
    : ROOT_NAVIGATION_STACK_GLOBAL;
}

/**
 * Returns the title associated with a route id.
 *
 * @param routeId - Route identifier to display.
 * @returns Human-readable title for the route.
 */
export function titleForRoute(routeId: RouteId): string {
  return ROUTE_TITLES[routeId];
}

/**
 * Returns supplemental key hints for a route when the route defines them.
 *
 * @param routeId - Route identifier to resolve.
 * @returns Route-specific hints, or an empty list when none are defined.
 */
export function supplementalHintsForRoute(routeId: RouteId): readonly KeyHintDescriptor[] {
  return ROUTE_SUPPLEMENTAL_HINTS[routeId] ?? [];
}

/**
 * Pushes a route onto the navigation stack and preserves the existing entries.
 *
 * @param stack - Existing stack with at least one root entry.
 * @param routeId - Route identifier to append.
 * @param contextLabel - Optional short qualifier for the appended route.
 * @returns New navigation stack with the route appended.
 */
export function pushRoute(
  stack: readonly NavigationStackEntry[],
  routeId: RouteId,
  contextLabel?: string,
): NavigationStackEntry[] {
  return [...stack, { routeId, title: titleForRoute(routeId), contextLabel }];
}

/**
 * Pops one child route while preserving the instance home root.
 *
 * @param stack - Existing stack with at least one root entry.
 * @returns New stack with one child route removed, or the original root stack.
 */
export function popRoute(stack: readonly NavigationStackEntry[]): NavigationStackEntry[] {
  if (stack.length <= 1) {
    return [...stack];
  }

  return stack.slice(0, -1);
}

/**
 * Returns the route id at the top of the navigation stack.
 *
 * @param stack - Existing stack with at least one route entry.
 * @returns Current route id represented by the final stack entry.
 */
export function currentRoute(stack: readonly NavigationStackEntry[]): RouteId {
  return stack.at(-1)?.routeId ?? 'global-home';
}

/**
 * Formats the navigation stack for compact breadcrumb display.
 *
 * @param stack - Existing stack with title-bearing route entries.
 * @returns Breadcrumb text joined from route titles and context labels.
 */
export function formatBreadcrumb(stack: readonly NavigationStackEntry[]): string {
  return stack
    .map((entry) =>
      entry.contextLabel == null ? entry.title : `${entry.title}: ${entry.contextLabel}`,
    )
    .join(' > ');
}
