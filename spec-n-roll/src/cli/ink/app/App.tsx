import React, { useCallback, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import type { VersionInvocationTarget } from '../../commands/version.js';
import {
  allocateFullscreenLayout,
  ContextContent,
  isMinimumLayout,
  type SelectedOptionContext,
} from '../components/ContextContent.js';
import { KeyHintOverlay } from '../components/KeyHintOverlay.js';
import { SelectionRowProvider } from '../components/SelectionRegion.js';
import { StatusBar } from '../components/StatusBar.js';
import { useTerminalSize } from '../hooks/use-terminal-size.js';
import { AgentAddScreen } from '../screens/agents/agent-add.js';
import { AgentsListScreen } from '../screens/agents/agents-list.js';
import { AgentRemoveScreen } from '../screens/agents/agent-remove.js';
import { MainMenu } from '../screens/main-menu.js';
import { ProjectMetadataEditScreen } from '../screens/project/project-metadata-edit.js';
import { ProjectMetadataViewScreen } from '../screens/project/project-metadata-view.js';
import { SetupInitScreen } from '../screens/setup/setup-init.js';
import { SetupMenuScreen } from '../screens/setup/setup-menu.js';
import { SetupUpdateScreen } from '../screens/setup/setup-update.js';
import { SetupVersionScreen } from '../screens/setup/setup-version.js';
import { SpecFrontmatterUpdateScreen } from '../screens/specs/spec-frontmatter-update.js';
import { SpecDetailScreen } from '../screens/specs/spec-detail.js';
import { SpecMutationsScreen } from '../screens/specs/spec-mutations.js';
import { SpecsListScreen } from '../screens/specs/specs-list.js';
import { StepInstantiateScreen } from '../screens/specs/step-instantiate.js';
import { TaskCheckboxSetScreen } from '../screens/specs/task-checkbox-set.js';
import { TaskStatusSetScreen } from '../screens/specs/task-status-set.js';
import { WorkflowStateScreen } from '../screens/specs/workflow-state.js';
import { WorkflowDetailScreen } from '../screens/workflows/workflow-detail.js';
import { WorkflowsListScreen } from '../screens/workflows/workflows-list.js';
import { SessionProvider, useSession } from './session-context.js';
import { contextForRoute, titleForRoute, type RouteId } from './navigation.js';

/**
 * Startup props for the interactive application shell.
 */
export interface AppProps {
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
}

/**
 * Callback used by screens to report read-only focused row context.
 */
export type SelectedContextChangeHandler = (context: SelectedOptionContext | undefined) => void;

/**
 * Rows consumed by the bordered status bar region.
 */
const STATUS_REGION_ROWS = 3;

/**
 * Rows consumed by the bordered key hint region when visible.
 */
const KEY_HINT_REGION_ROWS = 3;

/**
 * Minimum context rows required before the normal shell layout is considered usable.
 */
const MINIMUM_CONTEXT_ROWS = 1;

/**
 * Focus context tagged with the route that produced it.
 */
interface RouteSelectedContext {
  /**
   * Route id active when the context was reported.
   */
  routeId: RouteId;
  /**
   * Read-only context attached to the focused option.
   */
  context: SelectedOptionContext;
}

/**
 * Props shared by routed screens that can report selected option context.
 */
interface RouteRendererProps {
  /**
   * Called when the active screen focus moves to a row with optional context.
   */
  onContextChange: SelectedContextChangeHandler;
}

/**
 * Renders the fallback shown when the terminal cannot fit the required shell regions.
 *
 * @param props - Minimum row count needed for normal interactive rendering.
 * @returns React element with resize guidance for the current terminal.
 */
function MinimumSizeMessage(props: { minimumRows: number }): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        Terminal is too small
      </Text>
      <Text>Resize to at least {props.minimumRows} rows to continue.</Text>
    </Box>
  );
}

/**
 * Renders a placeholder route for screens that are intentionally deferred to later phases.
 *
 * @param routeId - Current route id requiring a placeholder.
 * @returns React element for a deferred screen.
 */
function PlaceholderScreen({ routeId }: { routeId: RouteId }): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>{titleForRoute(routeId)}</Text>
      <Text color="gray">This screen is reserved for a later implementation phase.</Text>
    </Box>
  );
}

/**
 * Routes the current session route id to its screen component.
 *
 * @returns React element for the active route.
 */
function RouteRenderer(props: RouteRendererProps): React.ReactElement {
  const session = useSession();

  switch (session.routeId) {
    case 'main-menu':
      return <MainMenu onContextChange={props.onContextChange} />;
    case 'specs-list':
      return <SpecsListScreen onContextChange={props.onContextChange} />;
    case 'spec-detail':
      return <SpecDetailScreen />;
    case 'spec-mutations':
      return <SpecMutationsScreen />;
    case 'task-status-set':
      return <TaskStatusSetScreen />;
    case 'task-checkbox-set':
      return <TaskCheckboxSetScreen />;
    case 'workflow-state':
      return <WorkflowStateScreen />;
    case 'workflows-list':
      return <WorkflowsListScreen onContextChange={props.onContextChange} />;
    case 'workflow-detail':
      return <WorkflowDetailScreen />;
    case 'agents-list':
      return <AgentsListScreen onContextChange={props.onContextChange} />;
    case 'agent-add':
      return <AgentAddScreen />;
    case 'agent-remove':
      return <AgentRemoveScreen />;
    case 'project-metadata-view':
      return <ProjectMetadataViewScreen onContextChange={props.onContextChange} />;
    case 'project-metadata-edit':
      return <ProjectMetadataEditScreen />;
    case 'setup-menu':
      return <SetupMenuScreen onContextChange={props.onContextChange} />;
    case 'setup-init':
      return <SetupInitScreen />;
    case 'setup-version':
      return <SetupVersionScreen />;
    case 'setup-update':
      return <SetupUpdateScreen />;
    case 'setup-step-instantiate':
      return <StepInstantiateScreen />;
    case 'setup-frontmatter-update':
      return <SpecFrontmatterUpdateScreen />;
    default:
      return <PlaceholderScreen routeId={session.routeId} />;
  }
}

/**
 * Handles global keyboard shortcuts and renders the shell frame.
 *
 * @returns React element for the routed interactive shell.
 */
function AppShell(): React.ReactElement {
  const session = useSession();
  const app = useApp();
  const { rows: terminalRows } = useTerminalSize();
  const [showHints, setShowHints] = useState(true);
  const [selectedContext, setSelectedContext] = useState<RouteSelectedContext | null>(null);
  const [reportedSelectionRows, setReportedSelectionRows] = useState(1);
  const keyHintRows = showHints ? KEY_HINT_REGION_ROWS : 0;
  const selectionRows = reportedSelectionRows + keyHintRows;
  const layout = allocateFullscreenLayout({
    terminalRows,
    statusRows: STATUS_REGION_ROWS,
    selectionRows,
    minimumContextRows: MINIMUM_CONTEXT_ROWS,
  });
  const routeContext = contextForRoute(session.routeId);
  const focusedContext =
    selectedContext?.routeId === session.routeId ? selectedContext.context : undefined;
  const contextState = useMemo(
    () => ({
      ...routeContext,
      selectedContext: focusedContext,
      availableRows: layout.contentRows,
    }),
    [focusedContext, layout.contentRows, routeContext],
  );
  const handleContextChange = useCallback(
    (context: SelectedOptionContext | undefined) => {
      setSelectedContext(context == null ? null : { routeId: session.routeId, context });
    },
    [session.routeId],
  );

  useInput((input, key) => {
    if (input === 'q') {
      app.exit();
      return;
    }

    if (input === '?' || (key.shift && input === '/')) {
      setShowHints((current) => !current);
      return;
    }

    if (input === 'b' || key.escape) {
      session.popRoute();
    }
  });

  if (isMinimumLayout(layout)) {
    return (
      <Box flexDirection="column" height={layout.terminalRows}>
        <MinimumSizeMessage minimumRows={layout.minimumRows} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={layout.terminalRows}>
      <Box flexShrink={0}>
        <StatusBar />
      </Box>
      <ContextContent state={contextState} />
      <Box flexShrink={0} flexDirection="column">
        <SelectionRowProvider onRowCountChange={setReportedSelectionRows}>
          <RouteRenderer onContextChange={handleContextChange} />
        </SelectionRowProvider>
        <KeyHintOverlay visible={showHints} />
      </Box>
    </Box>
  );
}

/**
 * Root Ink application component for the interactive CLI.
 *
 * @param props - Startup session values.
 * @returns React element for the interactive application.
 */
export function App(props: AppProps): React.ReactElement {
  return (
    <SessionProvider
      projectRoot={props.projectRoot}
      isInitialized={props.isInitialized}
      binaryContext={props.binaryContext}
      localBinaryPath={props.localBinaryPath}
    >
      <AppShell />
    </SessionProvider>
  );
}
