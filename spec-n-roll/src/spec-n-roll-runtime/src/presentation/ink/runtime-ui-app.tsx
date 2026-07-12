import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { RuntimeUiMode } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
import { TerminalLayoutAllocator } from '#runtime/application/ui/terminal-layout-allocator.js';
import { NavigationStack, type RouteId } from '#runtime/presentation/ink/navigation-stack.js';
import { RouteScreen } from '#runtime/presentation/ink/route-screen.jsx';
import { useStdoutSize } from '#runtime/presentation/ink/use-stdout-size.js';

/**
 * Describes startup state for the interactive runtime application.
 */
export interface RuntimeUiAppProps {
  /** Invocation mode that selects the initial home route. */
  readonly mode: RuntimeUiMode;
}

/** Milliseconds before an unconfirmed exit dialog closes automatically. */
const EXIT_DIALOG_TIMEOUT_MS = 3000;

/**
 * Renders the stable status, route content, and key hint regions for the runtime UI.
 *
 * @param props - Resolved invocation mode used to choose the home route.
 * @returns Fullscreen Ink application shell.
 */
export function RuntimeUiApp(props: RuntimeUiAppProps): React.ReactElement {
  const app = useApp();
  const size = useStdoutSize();
  const layout = useMemo(() => new TerminalLayoutAllocator().allocate(size.rows), [size.rows]);
  const navigation = useMemo(
    () => new NavigationStack(props.mode === 'local' ? 'local-home' : 'global-home'),
    [props.mode],
  );
  const [route, setRoute] = useState<RouteId>(navigation.current());
  const [exitPending, setExitPending] = useState(false);

  const requestExit = useCallback((): void => setExitPending(true), []);
  useEffect(() => {
    if (!exitPending) return;
    const timeout = setTimeout(() => setExitPending(false), EXIT_DIALOG_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [exitPending]);

  useInput((input, key) => {
    if (exitPending) {
      if (key.escape || input.toLowerCase() === 'q') app.exit();
      return;
    }
    if (!key.escape) return;
    if (navigation.isHome()) requestExit();
    else {
      navigation.pop();
      setRoute(navigation.current());
    }
  });

  if (layout.requiresResize) {
    return (
      <Box height={layout.terminalRows} flexDirection="column" justifyContent="center" alignItems="center">
        <Text bold color="yellow">Terminal is too small</Text>
        <Text>Resize to at least {layout.minimumRows} rows.</Text>
      </Box>
    );
  }

  return (
    <Box height={layout.terminalRows} width={size.columns} flexDirection="column">
      <Box height={layout.statusRows} flexShrink={0} borderStyle="single" paddingX={1}>
        <Text bold>Spec N' Roll · {route}</Text>
      </Box>
      <Box height={layout.contentRows} flexDirection="column">
        <RouteScreen
          route={route}
          rows={layout.contentRows}
          onNavigate={(next) => { navigation.push(next); setRoute(navigation.current()); }}
          onBack={() => { navigation.pop(); setRoute(navigation.current()); }}
          onExitRequest={requestExit}
        />
        {exitPending ? (
          <Box position="absolute" height={layout.contentRows} width="100%" alignItems="center" justifyContent="center">
            <Box borderStyle="round" paddingX={2} paddingY={1} backgroundColor="black">
              <Text bold color="yellow">Press esc/q to exit</Text>
            </Box>
          </Box>
        ) : null}
      </Box>
      <Box height={layout.hintRows} flexShrink={0} borderStyle="single" paddingX={1}>
        <Text color="gray">↑/↓ select · Enter open · Esc back · PgUp/PgDn scroll</Text>
      </Box>
    </Box>
  );
}
