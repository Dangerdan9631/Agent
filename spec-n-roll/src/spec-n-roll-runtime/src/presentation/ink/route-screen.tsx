import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { RouteId } from '#runtime/presentation/ink/navigation-stack.js';
import {
  MenuList,
  type MenuItem,
} from '#runtime/presentation/ink/menu-list.jsx';
import { ScrollableContent } from '#runtime/presentation/ink/scrollable-content.jsx';
import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';

/**
 * Describes the route-owned interior of the shell content slot.
 */
export interface RouteScreenProps {
  /** Active route to render. */
  readonly route: RouteId;
  /** Rows allocated by the application shell. */
  readonly rows: number;
  /** Opens a placeholder child route. */
  readonly onNavigate: (
    route: 'init' | 'placeholder-one' | 'placeholder-two',
  ) => void;
  /** Returns from a placeholder route to its parent. */
  readonly onBack: () => void;
  /** Starts the timed exit confirmation dialog. */
  readonly onExitRequest: () => void;
  /**
   * Project state and commands configured for this session.
   */
  readonly session: RuntimeUiSession;
}

const SECONDARY_HOME_MENU: readonly MenuItem[] = [
  { id: 'one', label: 'Placeholder page one' },
  { id: 'disabled-one', label: 'Unavailable placeholder', disabled: true },
  { id: 'two', label: 'Placeholder page two' },
  {
    id: 'disabled-two',
    label: 'Another unavailable placeholder',
    disabled: true,
  },
  { id: 'exit', label: 'Exit' },
];

const PLACEHOLDER_LINES = Array.from(
  { length: 24 },
  (_, index) => `Placeholder scrolling content line ${index + 1}.`,
);

/**
 * Renders home and placeholder routes inside the route content slot.
 *
 * @param props - Active route, row budget, and navigation callbacks.
 * @returns Route-owned content and selection regions.
 */
export function RouteScreen(props: RouteScreenProps): React.ReactElement {
  if (props.route === 'init') {
    return (
      <InitRoute
        rows={props.rows}
        initializeProject={props.session.initializeProject}
      />
    );
  }
  const home = props.route === 'global-home' || props.route === 'local-home';
  const homeMenu: readonly MenuItem[] =
    props.route === 'global-home'
      ? [
          {
            id: 'init',
            label: 'Initialize Project',
            disabled: props.session.projectFound,
          },
          ...SECONDARY_HOME_MENU,
        ]
      : SECONDARY_HOME_MENU;
  const menuRows = home ? homeMenu.length : 1;
  const separatorRows = 1;
  const contentRows = Math.max(1, props.rows - menuRows - separatorRows);
  const title = home
    ? props.route === 'global-home'
      ? 'global'
      : 'local'
    : props.route === 'placeholder-one'
      ? 'placeholder one'
      : 'placeholder two';

  const onSelect = (item: MenuItem): void => {
    if (item.id === 'exit') props.onExitRequest();
    else if (item.id === 'init') props.onNavigate('init');
    else if (item.id === 'back') props.onBack();
    else if (item.id === 'one' || item.id === 'two')
      props.onNavigate(
        item.id === 'one' ? 'placeholder-one' : 'placeholder-two',
      );
  };

  return (
    <Box flexDirection="column" height={props.rows}>
      <Box flexDirection="column" height={contentRows} paddingX={2}>
        <Text bold>{title}</Text>
        <ScrollableContent
          rows={Math.max(0, contentRows - 1)}
          lines={PLACEHOLDER_LINES}
        />
      </Box>
      <Box
        borderStyle="single"
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        height={separatorRows}
        width="100%"
      />
      <MenuList
        items={home ? homeMenu : [{ id: 'back', label: 'Back' }]}
        onSelect={onSelect}
      />
    </Box>
  );
}

/**
 * Describes the initialization route execution boundary.
 */
interface InitRouteProps {
  /**
   * Rows allocated to the route.
   */
  readonly rows: number;
  /**
   * Project initialization command to run once.
   */
  readonly initializeProject: () => void;
}

/**
 * Runs project initialization when its route loads and reports the outcome.
 *
 * @param props - Row allocation and configured project command.
 * @returns Initialization progress or result content.
 */
function InitRoute(props: InitRouteProps): React.ReactElement {
  const [result, setResult] = useState('Initializing project…');
  useEffect(() => {
    try {
      props.initializeProject();
      setResult('Project initialized successfully.');
    } catch (error) {
      setResult(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [props.initializeProject]);
  return (
    <Box height={props.rows} paddingX={2}>
      <Text>{result}</Text>
    </Box>
  );
}
