import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, useInput } from 'ink';
import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';
import { ActionLayout } from '#runtime/presentation/ink/layouts/action-layout.jsx';
import { ConsoleHistory } from '#runtime/presentation/ink/layouts/console-history.js';
import { ConsoleLayout } from '#runtime/presentation/ink/layouts/console-layout.jsx';
import { ConsoleOutputBuffer } from '#runtime/presentation/ink/layouts/console-output-buffer.js';
import { type MenuItem } from '#runtime/presentation/ink/menu-list.jsx';
import type { RouteId } from '#runtime/presentation/ink/navigation-stack.js';

/**
 * Describes the route-owned layout selected for the active application route.
 */
export interface RouteScreenProps {
  /** Active route to render. */
  readonly route: RouteId;
  /** Rows allocated by the application scaffold. */
  readonly rows: number;
  /** Opens an application command route. */
  readonly onNavigate: (
    route: 'init' | 'agents' | 'manage' | 'global-update' | 'project-update',
  ) => void;
  /** Starts the shell exit confirmation dialog. */
  readonly onExitRequest: () => void;
  /** Reports whether a completed global update should reload after back navigation. */
  readonly onReloadRequired: () => void;
  /** Reports whether an uncancellable framework update is currently running. */
  readonly onUpdateRunningChange: (running: boolean) => void;
  /** Project state and commands configured for this session. */
  readonly session: RuntimeUiSession;
}

/**
 * Renders the layout selected by the active route.
 *
 * @param props - Active route, row budget, and command boundaries.
 * @returns Route-owned action or console layout.
 */
export function RouteScreen(props: RouteScreenProps): React.ReactElement {
  if (props.route === 'agents') {
    return (
      <AgentsRoute
        rows={props.rows}
        listAgents={props.session.listAgents}
        configureBuiltInAgents={props.session.configureBuiltInAgents}
      />
    );
  }

  if (props.route === 'manage') {
    return (
      <ManageRoute
        rows={props.rows}
        onNavigate={props.onNavigate}
        availability={props.session.projectUpdate}
      />
    );
  }

  if (props.route === 'global-update') {
    return (
      <GlobalUpdateRoute
        rows={props.rows}
        updateGlobalFramework={props.session.updateGlobalFramework}
        onReloadRequired={props.onReloadRequired}
        onRunningChange={props.onUpdateRunningChange}
      />
    );
  }

  if (props.route === 'project-update') {
    return (
      <ProjectUpdateRoute
        rows={props.rows}
        updateProjectFramework={props.session.updateProjectFramework}
        onRunningChange={props.onUpdateRunningChange}
      />
    );
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
 * Renders a home page and refreshes the configured project state when it loads.
 *
 * @param props - Route dimensions, session context, and navigation callbacks.
 * @returns Home content and home-specific actions.
 */
function HomeRoute(props: {
  /** Starts the shell exit confirmation dialog. */
  readonly onExitRequest: () => void;
  /** Opens an application command route. */
  readonly onNavigate: (
    route: 'init' | 'agents' | 'manage' | 'global-update' | 'project-update',
  ) => void;
  /** Total rows allocated to the route. */
  readonly rows: number;
  /** Project state and commands configured for this session. */
  readonly session: RuntimeUiSession;
}): React.ReactElement {
  const [projectFound, setProjectFound] = useState(props.session.projectFound);

  useEffect(() => {
    setProjectFound(props.session.projectExists());
  }, [props.session]);

  const initializationAction: readonly MenuItem[] =
    props.session.mode === 'global'
      ? [
          {
            id: 'init',
            label: 'Initialize Project',
            disabled: projectFound,
          },
        ]
      : [];
  const actions: readonly MenuItem[] = [
    ...initializationAction,
    ...(props.session.mode === 'local'
      ? [
          { id: 'manage', label: 'Manage Spec-N-Roll' },
          { id: 'agents', label: 'Agents' },
        ]
      : []),
    ...(props.session.mode === 'global' && projectFound
      ? [
          {
            id: 'update-project',
            label: 'Update Project Framework',
            disabled: !props.session.projectUpdate.enabled,
          },
        ]
      : []),
    ...(props.session.mode === 'global'
      ? [
          {
            id: 'update-global',
            label: 'Update Global Framework',
            disabled: !props.session.globalUpdate.enabled,
          },
        ]
      : []),
    { id: 'exit', label: 'Exit' },
  ];

  return (
    <ActionLayout
      actions={actions}
      content={<HomeContent session={props.session} />}
      onActionSelect={(action) => {
        if (action.id === 'init') props.onNavigate('init');
        if (action.id === 'manage') props.onNavigate('manage');
        if (action.id === 'update-project') props.onNavigate('project-update');
        if (action.id === 'update-global') props.onNavigate('global-update');
        if (action.id === 'agents') props.onNavigate('agents');
        if (action.id === 'exit') props.onExitRequest();
      }}
      rows={props.rows}
    />
  );
}

/**
 * Renders installation and project context for a runtime home page.
 *
 * @param props - Session metadata selected for the active runtime.
 * @returns Installation and project context display.
 */
function HomeContent(props: {
  /** Project state and commands configured for this session. */
  readonly session: RuntimeUiSession;
}): React.ReactElement {
  const dispatcherSource =
    props.session.dispatcher.installSource === 'local' ? 'Local' : 'Remote';
  const runtimeSource = props.session.runtime.projectLocal ? 'Local' : 'Global';

  return (
    <>
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
      <Text> </Text>
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
      <Text> </Text>
      <Text>
        <Text bold color="cyan">
          Project Root:
        </Text>{' '}
        {props.session.projectRoot ?? 'None'}
      </Text>
    </>
  );
}

/**
 * Describes the initialization route command and its allocated row budget.
 */
interface InitRouteProps {
  /** Rows allocated to the route. */
  readonly rows: number;
  /** Project initialization command supplied with chosen built-in agents. */
  readonly initializeProject: (agents: readonly string[]) => void;
}

/**
 * Lets the user choose built-in agents before initializing the project.
 *
 * @param props - Row allocation and configured project command.
 * @returns Initialization progress or result content.
 */
function InitRoute(props: InitRouteProps): React.ReactElement {
  const agents = ['codex', 'cursor'] as const;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedAgents, setSelectedAgents] =
    useState<readonly string[]>(agents);
  const [result, setResult] = useState<string>();

  useInput((_input, key) => {
    if (result != null) return;
    if (key.upArrow)
      setSelectedIndex(
        (value) => (value - 1 + agents.length + 1) % (agents.length + 1),
      );
    if (key.downArrow)
      setSelectedIndex((value) => (value + 1) % (agents.length + 1));
    if (_input === ' ' && selectedIndex < agents.length) {
      const agent = agents[selectedIndex];
      setSelectedAgents((current) =>
        current.includes(agent)
          ? current.filter((value) => value !== agent)
          : [...current, agent],
      );
    }
    if (key.return && selectedIndex === agents.length) {
      if (selectedAgents.length === 0) {
        setResult('Select at least one built-in agent before initializing.');
        return;
      }
      try {
        props.initializeProject(selectedAgents);
        setResult('Project initialized successfully.');
      } catch (error) {
        setResult(
          `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  });

  if (result != null)
    return (
      <ActionLayout
        actions={[]}
        content={<Text>{result}</Text>}
        rows={props.rows}
      />
    );

  return (
    <ActionLayout
      actions={[]}
      content={
        <Text>
          Select built-in agents (Space toggles, Enter initializes){'\n'}
          {agents.map(
            (agent, index) =>
              `${selectedIndex === index ? '›' : ' '} [${selectedAgents.includes(agent) ? 'x' : ' '}] ${agent}\n`,
          )}
          {`${selectedIndex === agents.length ? '›' : ' '} Initialize project`}
        </Text>
      }
      rows={props.rows}
    />
  );
}

/**
 * Renders registered agent extensions for a project.
 *
 * @param props - Route row budget and asynchronous agent query.
 * @returns Agent registration content in the action layout.
 */
function AgentsRoute(props: {
  /** Rows allocated to the route. */
  readonly rows: number;
  /** Retrieves registered agent extensions for the active project. */
  readonly listAgents: () => Promise<
    readonly { readonly name: string; readonly enabled: boolean }[]
  >;
  /** Persists the selected built-in agent extensions. */
  readonly configureBuiltInAgents: (agents: readonly string[]) => void;
}): React.ReactElement {
  const agents = useMemo(() => ['codex', 'cursor'] as const, []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState<readonly string[]>();
  const [content, setContent] = useState('Loading agents…');

  useEffect(() => {
    props
      .listAgents()
      .then((registered) =>
        setSelectedAgents(
          registered
            .filter(
              (agent) =>
                agent.enabled &&
                agents.includes(agent.name as 'codex' | 'cursor'),
            )
            .map((agent) => agent.name),
        ),
      )
      .catch((error: unknown) =>
        setContent(
          `Unable to list agents: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  }, [agents, props]);

  useInput((input, key) => {
    if (selectedAgents == null) return;
    if (key.upArrow)
      setSelectedIndex(
        (value) => (value - 1 + agents.length + 1) % (agents.length + 1),
      );
    if (key.downArrow)
      setSelectedIndex((value) => (value + 1) % (agents.length + 1));
    if (input === ' ' && selectedIndex < agents.length) {
      const agent = agents[selectedIndex];
      setSelectedAgents((current) =>
        current?.includes(agent)
          ? current.filter((value) => value !== agent)
          : [...(current ?? []), agent],
      );
    }
    if (key.return && selectedIndex === agents.length) {
      try {
        props.configureBuiltInAgents(selectedAgents);
        setContent('Built-in agent selection saved.');
      } catch (error) {
        setContent(
          `Unable to update agents: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  });

  if (selectedAgents == null)
    return (
      <ActionLayout
        actions={[]}
        content={<Text>{content}</Text>}
        rows={props.rows}
      />
    );

  return (
    <ActionLayout
      actions={[]}
      content={
        <Text>
          Manage built-in agents (Space toggles, Enter saves){'\n'}
          {agents.map(
            (agent, index) =>
              `${selectedIndex === index ? '›' : ' '} [${selectedAgents.includes(agent) ? 'x' : ' '}] ${agent}\n`,
          )}
          {`${selectedIndex === agents.length ? '›' : ' '} Save changes`}
          {content.startsWith('Built-in') ? `\n${content}` : ''}
        </Text>
      }
      rows={props.rows}
    />
  );
}

/**
 * Renders the local framework management actions.
 *
 * @param props - Route row budget, update availability, and navigation callback.
 * @returns Local framework management action layout.
 */
function ManageRoute(props: {
  /** Rows allocated to the route. */
  readonly rows: number;
  /** Opens the project framework update route. */
  readonly onNavigate: (route: 'project-update') => void;
  /** Whether the local framework can be updated. */
  readonly availability: { readonly enabled: boolean };
}): React.ReactElement {
  const actions: readonly MenuItem[] = [
    {
      id: 'update-project',
      label: 'Update Project Framework',
      disabled: !props.availability.enabled,
    },
  ];

  return (
    <ActionLayout
      actions={actions}
      content={<Text>Choose a framework maintenance action.</Text>}
      onActionSelect={() => props.onNavigate('project-update')}
      rows={props.rows}
    />
  );
}

/**
 * Runs a local project framework update on a console layout.
 *
 * @param props - Route rows, update command, and running-state callback.
 * @returns Project update transcript.
 */
function ProjectUpdateRoute(props: {
  /** Rows allocated to the route. */
  readonly rows: number;
  /** Updates the project-local framework. */
  readonly updateProjectFramework: () => void;
  /** Reports whether the update command is currently executing. */
  readonly onRunningChange: (running: boolean) => void;
}): React.ReactElement {
  const history = useMemo(() => new ConsoleHistory(), []);
  const [output, setOutput] = useState('Starting project framework update…\n');
  const appendOutput = useCallback(
    (newOutput: string): void =>
      setOutput((currentOutput) => history.append(currentOutput, newOutput)),
    [history],
  );

  useEffect(() => {
    props.onRunningChange(true);
    try {
      props.updateProjectFramework();
      appendOutput('Project update completed.');
    } catch (error) {
      appendOutput(
        `Update failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      props.onRunningChange(false);
    }
    return () => props.onRunningChange(false);
  }, [appendOutput, props.onRunningChange, props.updateProjectFramework]);

  return <ConsoleLayout rows={props.rows} output={output} />;
}

/**
 * Runs a global framework update on a console layout.
 *
 * @param props - Route rows, update command, and running-state callback.
 * @returns Global update transcript.
 */
function GlobalUpdateRoute(props: {
  /** Rows allocated to the route. */
  readonly rows: number;
  /** Updates the global framework and emits transcript output. */
  readonly updateGlobalFramework: (output: {
    write(text: string): void;
  }) => Promise<void>;
  /** Requests a dispatcher reload after this update completes. */
  readonly onReloadRequired: () => void;
  /** Reports whether the update command is currently executing. */
  readonly onRunningChange: (running: boolean) => void;
}): React.ReactElement {
  const history = useMemo(() => new ConsoleHistory(), []);
  const [output, setOutput] = useState('Starting global framework update…\n');
  const appendOutput = useCallback(
    (newOutput: string): void =>
      setOutput((currentOutput) => history.append(currentOutput, newOutput)),
    [history],
  );
  const outputBuffer = useMemo(
    () => new ConsoleOutputBuffer(appendOutput),
    [appendOutput],
  );

  useEffect(() => {
    props.onRunningChange(true);
    void props
      .updateGlobalFramework({
        write: (text) => outputBuffer.write(text),
      })
      .then(() => {
        outputBuffer.write(
          '\nUpdate completed. Press Esc to return and reload runtime.',
        );
        props.onReloadRequired();
      })
      .catch((error: unknown) =>
        outputBuffer.write(
          `\nUpdate failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
      .finally(() => {
        outputBuffer.flush();
        props.onRunningChange(false);
      });
    return () => {
      outputBuffer.dispose();
      props.onRunningChange(false);
    };
  }, [
    outputBuffer,
    props.onReloadRequired,
    props.onRunningChange,
    props.updateGlobalFramework,
  ]);

  return <ConsoleLayout rows={props.rows} output={output} />;
}
