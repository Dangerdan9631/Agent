/**
 * Identifies routes available in the interactive runtime.
 */
export type RouteId = 'global-home' | 'local-home' | 'init';

/**
 * Maintains route history while preserving the selected home route as its root.
 */
export class NavigationStack {
  private readonly routes: RouteId[];

  /** @param home - Initial route that cannot be popped. */
  constructor(home: Extract<RouteId, 'global-home' | 'local-home'>) {
    this.routes = [home];
  }
  /** @returns Route currently displayed at the top of the stack. */
  current(): RouteId {
    return this.routes.at(-1) ?? this.routes[0]!;
  }
  /** @param route - Non-home route to display. */
  push(route: Exclude<RouteId, 'global-home' | 'local-home'>): void {
    this.routes.push(route);
  }
  /** Removes one child route while preserving the home route. */
  pop(): void {
    if (this.routes.length > 1) this.routes.pop();
  }
  /** @returns True when navigation currently displays its root route. */
  isHome(): boolean {
    return this.routes.length === 1;
  }
}
