import { useCallback, useEffect, useRef, useState } from 'react';

import type { RouteId } from '../app/navigation.js';

/**
 * Confirmation copy shown after the first `q` quit key press.
 */
export const QUIT_CONFIRMATION_Q_MESSAGE = 'Press q again to quit.';

/**
 * Confirmation copy shown after the first home-screen `Esc` quit key press.
 */
export const QUIT_CONFIRMATION_ESCAPE_MESSAGE = 'Press esc again to quit.';

/**
 * Secondary confirmation copy shown for non-confirming key behavior.
 */
export const QUIT_CONFIRMATION_CANCEL_MESSAGE = 'Any other key to continue.';

/**
 * Milliseconds the user has to confirm quit with a repeated quit key press.
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
   * Whether the confirmation message is visible and awaiting a repeated quit key.
   */
  pending: boolean;
  /**
   * Key that must be pressed again to confirm exit while pending.
   */
  triggerKey: QuitConfirmationTriggerKey | null;
}

/**
 * Actions returned by {@link reduceQuitKeyPress} for pure state transitions.
 */
export type QuitKeyPressAction = 'start-pending' | 'confirm-exit';

/**
 * Keyboard inputs that can initiate and confirm the quit flow.
 */
export type QuitConfirmationTriggerKey = 'q' | 'escape';

/**
 * Result of applying one quit key press to the current pending flag.
 */
export interface QuitKeyPressResult {
  /**
   * Whether the confirmation message should remain visible after the press.
   */
  pending: boolean;
  /**
   * Key that must be repeated to confirm exit after the press.
   */
  triggerKey: QuitConfirmationTriggerKey | null;
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
   * Key that must be pressed again while pending, otherwise null.
   */
  triggerKey: QuitConfirmationTriggerKey | null;
  /**
   * Handles a `q` press or home-screen `Esc` mapped to the quit flow.
   */
  onQuitKey: (triggerKey?: QuitConfirmationTriggerKey) => void;
  /**
   * Cancels a pending quit when any non-confirming key is pressed.
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
 * @param currentTriggerKey - Key currently waiting for a repeat press, or null when idle.
 * @param triggerKey - Key that was just pressed to enter or confirm the flow.
 * @returns Next pending value and the action the caller should take.
 */
export function reduceQuitKeyPress(
  pending: boolean,
  currentTriggerKey: QuitConfirmationTriggerKey | null = null,
  triggerKey: QuitConfirmationTriggerKey = 'q',
): QuitKeyPressResult {
  if (pending && currentTriggerKey === triggerKey) {
    return { pending: false, triggerKey: null, action: 'confirm-exit' };
  }

  return { pending: true, triggerKey, action: 'start-pending' };
}

/**
 * Formats the modal confirmation message for the active quit trigger.
 *
 * @param triggerKey - Key currently waiting for a repeat press.
 * @returns Human-readable confirmation copy for the trigger.
 */
function messageForTriggerKey(triggerKey: QuitConfirmationTriggerKey | null): string | null {
  if (triggerKey === 'escape') {
    return QUIT_CONFIRMATION_ESCAPE_MESSAGE;
  }

  if (triggerKey === 'q') {
    return QUIT_CONFIRMATION_Q_MESSAGE;
  }

  return null;
}

/**
 * Tracks double-press quit confirmation with a fixed timeout and exposes handlers for global input.
 *
 * @param onExit - Callback invoked when the user confirms quit with a second `q`.
 * @returns Pending state, confirmation message, and input handlers for the app shell.
 */
export function useQuitConfirmation(onExit: () => void): UseQuitConfirmationResult {
  const [pending, setPending] = useState(false);
  const [triggerKey, setTriggerKey] = useState<QuitConfirmationTriggerKey | null>(null);
  const pendingRef = useRef(false);
  const triggerKeyRef = useRef<QuitConfirmationTriggerKey | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExitRef = useRef(onExit);

  pendingRef.current = pending;
  triggerKeyRef.current = triggerKey;

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const clearPendingTimer = useCallback((): void => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const onQuitKey = useCallback(
    (nextTriggerKey: QuitConfirmationTriggerKey = 'q'): void => {
      const result = reduceQuitKeyPress(pendingRef.current, triggerKeyRef.current, nextTriggerKey);

      if (result.action === 'confirm-exit') {
        clearPendingTimer();
        setPending(false);
        setTriggerKey(null);
        queueMicrotask(() => {
          onExitRef.current();
        });
        return;
      }

      clearPendingTimer();
      setPending(result.pending);
      setTriggerKey(result.triggerKey);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setPending(false);
        setTriggerKey(null);
      }, QUIT_CONFIRMATION_TIMEOUT_MS);
    },
    [clearPendingTimer],
  );

  const onOtherKey = useCallback((): void => {
    if (!pendingRef.current) {
      return;
    }

    clearPendingTimer();
    setPending(false);
    setTriggerKey(null);
  }, [clearPendingTimer]);

  useEffect(() => {
    return () => {
      clearPendingTimer();
    };
  }, [clearPendingTimer]);

  return {
    pending,
    message: pending ? messageForTriggerKey(triggerKey) : null,
    triggerKey,
    onQuitKey,
    onOtherKey,
  };
}
