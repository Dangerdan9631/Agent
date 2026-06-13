import { useCallback, useEffect, useRef, useState } from 'react';

import type { RouteId } from '../app/navigation.js';

/**
 * Confirmation copy shown after the first quit key press.
 */
export const QUIT_CONFIRMATION_MESSAGE = 'Press q again to quit';

/**
 * Milliseconds the user has to confirm quit with a second `q` press.
 */
export const QUIT_CONFIRMATION_TIMEOUT_MS = 3000;

/**
 * Route ids treated as home screens for quit-on-Esc behavior.
 */
const HOME_ROUTE_IDS: ReadonlySet<RouteId> = new Set(['global-home', 'local-home']);

/**
 * Mutable quit-confirmation state tracked by the hook.
 */
export interface QuitConfirmationState {
  /**
   * Whether the confirmation message is visible and awaiting a second `q`.
   */
  pending: boolean;
}

/**
 * Actions returned by {@link reduceQuitKeyPress} for pure state transitions.
 */
export type QuitKeyPressAction = 'start-pending' | 'confirm-exit';

/**
 * Result of applying one quit key press to the current pending flag.
 */
export interface QuitKeyPressResult {
  /**
   * Whether the confirmation message should remain visible after the press.
   */
  pending: boolean;
  /**
   * Side effect the caller should perform after updating pending state.
   */
  action: QuitKeyPressAction;
}

/**
 * Values and handlers exposed by {@link useQuitConfirmation}.
 */
export interface UseQuitConfirmationResult {
  /**
   * Whether the confirmation message is currently visible.
   */
  pending: boolean;
  /**
   * Confirmation message while pending, otherwise null.
   */
  message: string | null;
  /**
   * Handles a `q` press or home-screen `Esc` mapped to the quit flow.
   */
  onQuitKey: () => void;
  /**
   * Cancels a pending quit when any non-`q` key is pressed.
   */
  onOtherKey: () => void;
}

/**
 * Returns whether the route id is a home screen where `Esc` starts quit confirmation.
 *
 * @param routeId - Active route id from the navigation stack.
 * @returns true when the route is `global-home` or `local-home`.
 */
export function isHomeRoute(routeId: RouteId): boolean {
  return HOME_ROUTE_IDS.has(routeId);
}

/**
 * Applies one quit key press to the current pending flag without timers.
 *
 * @param pending - Whether quit confirmation is already active.
 * @returns Next pending value and the action the caller should take.
 */
export function reduceQuitKeyPress(pending: boolean): QuitKeyPressResult {
  if (pending) {
    return { pending: false, action: 'confirm-exit' };
  }

  return { pending: true, action: 'start-pending' };
}

/**
 * Tracks double-press quit confirmation with a fixed timeout and exposes handlers for global input.
 *
 * @param onExit - Callback invoked when the user confirms quit with a second `q`.
 * @returns Pending state, confirmation message, and input handlers for the app shell.
 */
export function useQuitConfirmation(onExit: () => void): UseQuitConfirmationResult {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExitRef = useRef(onExit);

  pendingRef.current = pending;

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const clearPendingTimer = useCallback((): void => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const onQuitKey = useCallback((): void => {
    if (pendingRef.current) {
      clearPendingTimer();
      setPending(false);
      queueMicrotask(() => {
        onExitRef.current();
      });
      return;
    }

    setPending(true);
    clearPendingTimer();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setPending(false);
    }, QUIT_CONFIRMATION_TIMEOUT_MS);
  }, [clearPendingTimer]);

  const onOtherKey = useCallback((): void => {
    if (!pendingRef.current) {
      return;
    }

    clearPendingTimer();
    setPending(false);
  }, [clearPendingTimer]);

  useEffect(() => {
    return () => {
      clearPendingTimer();
    };
  }, [clearPendingTimer]);

  return {
    pending,
    message: pending ? QUIT_CONFIRMATION_MESSAGE : null,
    onQuitKey,
    onOtherKey,
  };
}
