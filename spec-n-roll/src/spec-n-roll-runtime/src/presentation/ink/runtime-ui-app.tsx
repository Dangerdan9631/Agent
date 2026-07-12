import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';
import { TerminalLayoutAllocator } from '#runtime/application/ui/terminal-layout-allocator.js';
import {
  NavigationStack,
  type RouteId,
} from '#runtime/presentation/ink/navigation-stack.js';
import { RouteScreen } from '#runtime/presentation/ink/route-screen.jsx';
import { useStdoutSize } from '#runtime/presentation/ink/use-stdout-size.js';

/**
 * Describes startup state for the interactive runtime application.
 */
export interface RuntimeUiAppProps {
  /** Invocation mode that selects the initial home route. */
  readonly session: RuntimeUiSession;
}

/** Milliseconds before an unconfirmed exit dialog closes automatically. */
const EXIT_DIALOG_TIMEOUT_MS = 3000;

/**
 * Identifies the key required to confirm a pending exit request.
 */
type ExitConfirmationKey = 'enter' | 'escape';

/**
 * Renders the stable status, route content, and key hint regions for the runtime UI.
 *
 * @param props - Resolved invocation mode used to choose the home route.
 * @returns Fullscreen Ink application shell.
 */
export function RuntimeUiApp(props: RuntimeUiAppProps): React.ReactElement {
  const app = useApp();
  const size = useStdoutSize();
  const layout = useMemo(
    () => new TerminalLayoutAllocator().allocate(size.rows),
    [size.rows],
  );
  const navigation = useMemo(
    () =>
      new NavigationStack(
        props.session.mode === 'local' ? 'local-home' : 'global-home',
      ),
    [props.session.mode],
  );
  const [route, setRoute] = useState<RouteId>(navigation.current());
  const routeTitle =
    route === 'global-home' || route === 'local-home' ? 'Home' : route === 'agents' ? 'Agents' : route === 'manage' ? 'Manage Spec-N-Roll' : route === 'global-update' ? 'Update Global Framework' : route === 'project-update' ? 'Update Project Framework' : route;
  const [updateRunning, setUpdateRunning] = useState(false);
  const [exitConfirmationKey, setExitConfirmationKey] = 
    useState<ExitConfirmationKey>();

  const requestExit = useCallback(
    (confirmationKey: ExitConfirmationKey): void =>
      setExitConfirmationKey(confirmationKey),
    [],
  );
  useEffect(() => {
    if (exitConfirmationKey == null) return;
    const timeout = setTimeout(
      () => setExitConfirmationKey(undefined),
      EXIT_DIALOG_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [exitConfirmationKey]);

  useInput((_input, key) => {
    if (updateRunning) return;
    if (exitConfirmationKey === 'escape' && key.escape) {
      app.exit();
      return;
    }
    if (exitConfirmationKey === 'enter' && key.return) {
      app.exit();
      return;
    }
    if (exitConfirmationKey != null) return;
    if (!key.escape) return;
    if (navigation.isHome()) requestExit('escape');
    else {
      navigation.pop();
      setRoute(navigation.current());
    }
  });

  if (layout.requiresResize) {
    return (
      <Box
        height={layout.terminalRows}
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Text bold color="yellow">
          Terminal is too small
        </Text>
        <Text>Resize to at least {layout.minimumRows} rows.</Text>
      </Box>
    );
  }

  return (
    <Box
      height={layout.terminalRows}
      width={size.columns}
      flexDirection="column"
    >
      <Box
        height={layout.statusRows}
        flexShrink={0}
        borderStyle="single"
        paddingX={1}
      >
        <Text bold>Spec N' Roll · {routeTitle}</Text>
      </Box>
      <Box height={layout.contentRows} flexDirection="column">
        <RouteScreen
          route={route}
          rows={layout.contentRows}
          onNavigate={(next) => {
            navigation.push(next);
            setRoute(navigation.current());
          }}
          onExitRequest={() => requestExit('enter')}
          onUpdateRunningChange={setUpdateRunning}
          session={props.session}
        />
        {exitConfirmationKey != null ? (
          <Box
            position="absolute"
            height={layout.contentRows}
            width="100%"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              borderStyle="round"
              paddingX={2}
              paddingY={1}
              backgroundColor="black"
            >
              <Text bold color="yellow">
                Press {exitConfirmationKey} to exit
              </Text>
            </Box>
          </Box>
        ) : null}
      </Box>
      {route === 'global-update' || route === 'project-update' ? null : (
        <Box
          height={layout.hintRows}
          flexShrink={0}
          borderStyle="single"
          paddingX={1}
        >
          <Text color="gray">↑/↓ select · Enter open · Esc back</Text>
        </Box>
      )}
    </Box>
  );
}





