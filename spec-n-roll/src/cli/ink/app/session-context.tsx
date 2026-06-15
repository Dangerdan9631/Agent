import React, { createContext, useContext, useMemo, useState } from 'react';

import type { VersionInvocationTarget } from '../../commands/version.js';
import type { TaskSpecIdentity } from '../../../sdk/workflow/engine.js';
import {
  currentRoute,
  popRoute,
  pushRoute,
  rootNavigationStackFor,
  type NavigationStackEntry,
  type RouteId,
} from './navigation.js';
import { createDefaultInteractiveAppServices, type InteractiveAppServices } from './services.js';

/**
 * Immutable startup values for an interactive session.
 */
export interface SessionProviderProps {
  /**
   * Absolute path to the project directory that owns the session.
   */
  projectRoot: string;
  /**
   * Whether workflow configuration was readable when the app launched.
   */
  isInitialized: boolean;
  /**
   * Binary resolution context for the current CLI process.
   */
  binaryContext: VersionInvocationTarget;
  /**
   * Absolute local CLI path when the session is running through a project-local install.
   */
  localBinaryPath?: string;
  /**
   * Service bundle used by screens to load or mutate project data.
   */
  services?: InteractiveAppServices;
  /**
   * Child Ink elements rendered inside the provider.
   */
  children: React.ReactNode;
}

/**
 * Mutable session state and route actions shared by interactive screens.
 */
export interface SessionContextValue {
  /**
   * Absolute path to the project directory that owns the session.
   */
  projectRoot: string;
  /**
   * Whether the project had parseable workflow configuration at startup.
   */
  isInitialized: boolean;
  /**
   * Ordered route history used for rendering and breadcrumbs.
   */
  navigationStack: readonly NavigationStackEntry[];
  /**
   * Current route id at the top of the stack.
   */
  routeId: RouteId;
  /**
   * Task spec selected for detail or mutation flows, if any.
   */
  selectedTaskSpec: TaskSpecIdentity | null;
  /**
   * Binary resolution context for the current CLI process.
   */
  binaryContext: VersionInvocationTarget;
  /**
   * Absolute local CLI path when the session is running through a project-local install.
   */
  localBinaryPath?: string;
  /**
   * Service bundle used by screens to load or mutate project data.
   */
  services: InteractiveAppServices;
  /**
   * Pushes a child route onto the stack with an optional context label.
   */
  pushRoute: (routeId: RouteId, contextLabel?: string) => void;
  /**
   * Pops one child route while preserving the instance home root.
   */
  popRoute: () => void;
  /**
   * Replaces the selected task spec in memory.
   */
  setSelectedTaskSpec: (taskSpec: TaskSpecIdentity | null) => void;
}

/**
 * React context carrying the current interactive session.
 */
const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Provides interactive session state and navigation actions to child screens.
 *
 * @param props - Startup values and child elements for the session.
 * @returns React element wrapping children with session context.
 */
export function SessionProvider(props: SessionProviderProps): React.ReactElement {
  const [navigationStack, setNavigationStack] = useState<readonly NavigationStackEntry[]>(() =>
    rootNavigationStackFor(props.binaryContext),
  );
  const [selectedTaskSpec, setSelectedTaskSpec] = useState<TaskSpecIdentity | null>(null);
  const services = useMemo(
    () => props.services ?? createDefaultInteractiveAppServices(),
    [props.services],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      projectRoot: props.projectRoot,
      isInitialized: props.isInitialized,
      navigationStack,
      routeId: currentRoute(navigationStack),
      selectedTaskSpec,
      binaryContext: props.binaryContext,
      localBinaryPath: props.localBinaryPath,
      services,
      pushRoute: (routeId, contextLabel) => {
        setNavigationStack((current) => pushRoute(current, routeId, contextLabel));
      },
      popRoute: () => {
        setNavigationStack((current) => popRoute(current));
      },
      setSelectedTaskSpec,
    }),
    [
      props.binaryContext,
      props.isInitialized,
      props.localBinaryPath,
      props.projectRoot,
      navigationStack,
      services,
      selectedTaskSpec,
    ],
  );

  return <SessionContext.Provider value={value}>{props.children}</SessionContext.Provider>;
}

/**
 * Reads the active interactive session context.
 *
 * @returns Current session context value.
 * @throws Error when called outside SessionProvider.
 */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value == null) {
    throw new Error('useSession must be used within SessionProvider.');
  }

  return value;
}
