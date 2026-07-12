import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
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
  readonly onNavigate: (route: 'init' | 'agents' | 'manage' | 'global-update' | 'project-update') => void;
  /**
   * Starts the shell exit confirmation dialog.
   */
  readonly onExitRequest: () => void;
  /** Reports whether an uncancellable framework update is currently running. */
  readonly onUpdateRunningChange: (running: boolean) => void;
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
  if (props.route === 'agents') {
    return <AgentsRoute rows={props.rows} listAgents={props.session.listAgents} />;
  }

  if (props.route === 'manage') {
    return <ManageRoute rows={props.rows} onNavigate={props.onNavigate} availability={props.session.projectUpdate} />;
  }

  if (props.route === 'global-update') {
    return <GlobalUpdateRoute rows={props.rows} updateGlobalFramework={props.session.updateGlobalFramework} onRunningChange={props.onUpdateRunningChange} />;
  }
  if (props.route === 'project-update') {
    return <ProjectUpdateRoute rows={props.rows} updateProjectFramework={props.session.updateProjectFramework} onRunningChange={props.onUpdateRunningChange} />;
  }
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
  /** Reports whether an uncancellable framework update is currently running. */
  readonly onUpdateRunningChange: (running: boolean) => void;
  readonly onNavigate: (route: 'init' | 'agents' | 'manage' | 'global-update' | 'project-update') => void;
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
    ...(props.session.mode === 'local' ? [{ id: 'manage', label: 'Manage Spec-N-Roll' }, { id: 'agents', label: 'Agents' }] : []),
    ...(props.session.mode === 'global' && projectFound ? [{ id: 'update-project', label: 'Update Project Framework', disabled: !props.session.projectUpdate.enabled }] : []),
    ...(props.session.mode === 'global' ? [{ id: 'update-global', label: 'Update Global Framework', disabled: !props.session.globalUpdate.enabled }] : []),
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
          if (item.id === 'manage') props.onNavigate('manage');
          if (item.id === 'update-project') props.onNavigate('project-update');
          if (item.id === 'update-global') props.onNavigate('global-update');
          if (item.id === 'agents') props.onNavigate('agents');
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

/** Renders registered agent extensions for a project. */
function AgentsRoute(props: { readonly rows: number; readonly listAgents: () => Promise<readonly { readonly name: string; readonly enabled: boolean }[]> }): React.ReactElement {
  const [content, setContent] = useState('Loading agents…');
  useEffect(() => {
    props.listAgents().then((agents) => setContent(agents.length === 0 ? 'No agent extensions registered.' : agents.map((agent) => agent.name + '  ' + (agent.enabled ? 'enabled' : 'disabled')).join('\n'))).catch((error: unknown) => setContent('Unable to list agents: ' + (error instanceof Error ? error.message : String(error))));
  }, [props]);
  return <Box height={props.rows} paddingX={2}><Text>{content}</Text></Box>;
}



/** Renders the local framework management menu. */
function ManageRoute(props: { readonly rows: number; readonly onNavigate: (route: 'project-update') => void; readonly availability: { readonly enabled: boolean } }): React.ReactElement {
  const items: readonly MenuItem[] = [{ id: 'update-project', label: 'Update Project Framework', disabled: !props.availability.enabled }];
  return <Box height={props.rows} flexDirection="column" paddingX={2}><MenuList items={items} onSelect={() => props.onNavigate('project-update')} /></Box>;
}

/** Renders a console transcript that follows new output until the user scrolls away. */
function UpdateConsole(props: { readonly rows: number; readonly output: string }): React.ReactElement {
  const lines = props.output.split(/\r?\n/);
  const pageSize = Math.max(1, props.rows - 2);
  const [topLine, setTopLine] = useState(Math.max(0, lines.length - pageSize));
  const [following, setFollowing] = useState(true);
  const maximumTopLine = Math.max(0, lines.length - pageSize);
  useEffect(() => { if (following) setTopLine(maximumTopLine); }, [following, maximumTopLine]);
  useInput((_input, key) => {
    if (key.pageUp) { setFollowing(false); setTopLine((value) => Math.max(0, value - pageSize)); }
    if (key.pageDown) setTopLine((value) => { const next = Math.min(maximumTopLine, value + pageSize); setFollowing(next === maximumTopLine); return next; });
    if (key.end) { setFollowing(true); setTopLine(maximumTopLine); }
  });
  return <Box height={props.rows} paddingX={2}><Text wrap="wrap">{lines.slice(topLine, topLine + pageSize).join('\n')}</Text></Box>;
}

/** Runs a local project framework update on a console page. */
function ProjectUpdateRoute(props: { readonly rows: number; readonly updateProjectFramework: () => void; readonly onRunningChange: (running: boolean) => void }): React.ReactElement {
  const [output, setOutput] = useState('Starting project framework update…\n');
  useEffect(() => { props.onRunningChange(true); try { props.updateProjectFramework(); setOutput((value) => value + 'Project update completed.'); } catch (error) { setOutput((value) => value + `Update failed: ${error instanceof Error ? error.message : String(error)}`); } finally { props.onRunningChange(false); } return () => props.onRunningChange(false); }, [props.onRunningChange, props.updateProjectFramework]);
  return <UpdateConsole rows={props.rows} output={output} />;
}

/** Runs a global framework update on a console page. */
function GlobalUpdateRoute(props: { readonly rows: number; readonly updateGlobalFramework: (output: { write(text: string): void }) => Promise<void>; readonly onRunningChange: (running: boolean) => void }): React.ReactElement {
  const [output, setOutput] = useState('Starting global framework update…\n');
  useEffect(() => { props.onRunningChange(true); void props.updateGlobalFramework({ write: (text) => setOutput((value) => value + text) }).then(() => setOutput((value) => value + '\nUpdate completed. Reloading runtime…')).catch((error: unknown) => setOutput((value) => value + `\nUpdate failed: ${error instanceof Error ? error.message : String(error)}`)).finally(() => props.onRunningChange(false)); return () => props.onRunningChange(false); }, [props.onRunningChange, props.updateGlobalFramework]);
  return <UpdateConsole rows={props.rows} output={output} />;
}


