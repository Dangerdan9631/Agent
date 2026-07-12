import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { RouteId } from '#runtime/presentation/ink/navigation-stack.js';
import {
  MenuList,
  type MenuItem,
} from '#runtime/presentation/ink/menu-list.jsx';
import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';

/**
 * Describes the route-owned interior of the shell content slot.
 */
export interface RouteScreenProps {
  /**
   * Active route to render.
   */
  readonly route: RouteId;
  /**
   * Rows allocated by the application shell.
   */
  readonly rows: number;
  /**
   * Opens an application command route.
   */
  readonly onNavigate: (route: 'init') => void;
  /**
   * Starts the shell exit confirmation dialog.
   */
  readonly onExitRequest: () => void;
  /**
   * Project state and commands configured for this session.
   */
  readonly session: RuntimeUiSession;
}

/**
 * Renders home and application command routes inside the route content slot.
 *
 * @param props - Active route, row budget, and navigation callbacks.
 * @returns Route-owned content and selection regions.
 */
export function RouteScreen(props: RouteScreenProps): React.ReactElement {
  if (props.route === 'init') {
    return (
      <InitRoute
        initializeProject={props.session.initializeProject}
        rows={props.rows}
      />
    );
  }

  return (
    <HomeRoute
      onExitRequest={props.onExitRequest}
      onNavigate={props.onNavigate}
      rows={props.rows}
      session={props.session}
    />
  );
}

/**
 * Renders one home page and refreshes project state when the route loads.
 *
 * @param props - Route dimensions, session context, and navigation callbacks.
 * @returns Home content and home-specific commands.
 */
function HomeRoute(props: {
  readonly onExitRequest: () => void;
  readonly onNavigate: (route: 'init') => void;
  readonly rows: number;
  readonly session: RuntimeUiSession;
}): React.ReactElement {
  const [projectFound, setProjectFound] = useState(props.session.projectFound);

  useEffect(() => {
    setProjectFound(props.session.projectExists());
  }, [props.session]);

  const initializationItem: readonly MenuItem[] =
    props.session.mode === 'global'
      ? [
          {
            id: 'init',
            label: 'Initialize Project',
            disabled: projectFound,
          },
        ]
      : [];
  const homeMenu: readonly MenuItem[] = [
    ...initializationItem,
    { id: 'exit', label: 'Exit' },
  ];
  const menuRows = homeMenu.length;
  const separatorRows = 1;
  const contentRows = Math.max(1, props.rows - menuRows - separatorRows);

  return (
    <Box flexDirection="column" height={props.rows}>
      <Box flexDirection="column" height={contentRows} paddingX={2}>
        <HomeContent session={props.session} />
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
        items={homeMenu}
        onSelect={(item) => {
          if (item.id === 'init') props.onNavigate('init');
          if (item.id === 'exit') props.onExitRequest();
        }}
      />
    </Box>
  );
}

/**
 * Renders the installation and project context for a runtime home page.
 *
 * @param props - Session metadata selected for the active runtime.
 * @returns Installation and project context display.
 */
function HomeContent(props: {
  readonly session: RuntimeUiSession;
}): React.ReactElement {
  const dispatcherSource =
    props.session.dispatcher.installSource === 'local' ? 'Local' : 'Remote';
  const runtimeSource = props.session.runtime.projectLocal ? 'Local' : 'Global';

  return (
    <Box flexDirection="column">
      <Text>
        <Text bold color="cyan">
          Dispatcher:
        </Text>{' '}
        ({dispatcherSource}) {props.session.dispatcher.installDirectory}
      </Text>
      <Text>
        <Text bold color="cyan">
          Version:
        </Text>{' '}
        {props.session.dispatcher.packageVersion}
      </Text>
      <Box height={1} />
      <Text>
        <Text bold color="cyan">
          Runtime:
        </Text>{' '}
        ({runtimeSource}) {props.session.runtime.executablePath}
      </Text>
      <Text>
        <Text bold color="cyan">
          Version:
        </Text>{' '}
        {props.session.runtime.packageVersion}
      </Text>
      <Text>
        <Text bold color="cyan">
          Working Directory:
        </Text>{' '}
        {props.session.cwd}
      </Text>
      <Box height={1} />
      <Text>
        <Text bold color="cyan">
          Project Root:
        </Text>{' '}
        {props.session.projectRoot ?? 'None'}
      </Text>
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
