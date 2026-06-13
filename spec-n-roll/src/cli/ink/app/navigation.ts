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
 * Route-level context shown when no focused option has more specific content.
 */
export interface RouteContext {
  /**
   * Human-readable title for the route. Must match the route title vocabulary used by navigation.
   */
  routeTitle: string;
  /**
   * Section-level summary shown before a selectable row reports focused context.
   */
  fallbackSummary: string;
}

/**
 * Read-only fallback summaries for every interactive route.
 */
export const ROUTE_FALLBACK_SUMMARIES: Readonly<Record<RouteId, string>> = {
  'main-menu': 'Choose a section to inspect specs, workflows, agents, project metadata, or setup.',
  'specs-list': 'Browse task specs and inspect lifecycle, workflow, and artifact status.',
  'spec-detail': 'Review the selected task spec and choose read or mutation actions.',
  'spec-mutations': 'Choose the task spec mutation to run after reviewing the selected spec.',
  'task-status-set': 'Set the lifecycle status for the selected task spec.',
  'task-checkbox-set': 'Update task checkboxes for the selected task spec.',
  'workflow-state': 'Inspect or update workflow state for the selected task spec.',
  'workflows-list': 'Inspect workflow variants and their ordered step sequences.',
  'workflow-detail': 'Review the selected workflow variant and step labels.',
  'agents-list': 'Inspect agents and whether this project has configured them.',
  'agent-add': 'Choose a agent to enable in this project.',
  'agent-remove': 'Choose a configured agent to remove from this project.',
  'project-metadata-view': 'Inspect project metadata, current task ownership, and id allocation.',
  'project-metadata-edit':
    'Edit project metadata values used by task allocation and implementation.',
  'setup-menu': 'Run initialization and maintenance operations for this toolkit project.',
  'setup-init': 'Initialize missing project configuration and workflow assets.',
  'setup-version': 'Inspect the active CLI binary and version resolution details.',
  'setup-update': 'Update or dry-run toolkit maintenance for this project.',
  'setup-step-instantiate': 'Instantiate a workflow step template into the project.',
  'setup-frontmatter-update': 'Update task spec frontmatter metadata.',
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
 * Builds route-level context for a route id.
 *
 * @param routeId - Route identifier to describe.
 * @returns Fallback context containing a route title and summary.
 */
export function contextForRoute(routeId: RouteId): RouteContext {
  return {
    routeTitle: titleForRoute(routeId),
    fallbackSummary: ROUTE_FALLBACK_SUMMARIES[routeId],
  };
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
