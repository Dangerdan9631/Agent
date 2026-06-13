/**
 * Identifies every screen route handled by the interactive Ink application.
 */
export type RouteId =
  | 'main-menu'
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
 * Human-readable route titles for breadcrumb and placeholder rendering.
 */
export const ROUTE_TITLES: Readonly<Record<RouteId, string>> = {
  'main-menu': 'Main Menu',
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
  'project-metadata-view': 'Project',
  'project-metadata-edit': 'Edit Project',
  'setup-menu': 'Setup',
  'setup-init': 'Initialize Project',
  'setup-version': 'Version Info',
  'setup-update': 'Update Toolkit',
  'setup-step-instantiate': 'Instantiate Step',
  'setup-frontmatter-update': 'Update Frontmatter',
};

/**
 * Initial navigation stack rooted at the main menu.
 */
export const ROOT_NAVIGATION_STACK: readonly NavigationStackEntry[] = [
  { routeId: 'main-menu', title: ROUTE_TITLES['main-menu'] },
];

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
 * Pushes a route onto the navigation stack and preserves the existing entries.
 *
 * @param stack - Existing stack with at least the main-menu root entry.
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
 * Pops one child route while preserving the main-menu root.
 *
 * @param stack - Existing stack with at least the main-menu root entry.
 * @returns New stack with one child route removed, or the original root stack.
 */
export function popRoute(stack: readonly NavigationStackEntry[]): NavigationStackEntry[] {
  if (stack.length <= 1) {
    return [...ROOT_NAVIGATION_STACK];
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
  return stack.at(-1)?.routeId ?? 'main-menu';
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
