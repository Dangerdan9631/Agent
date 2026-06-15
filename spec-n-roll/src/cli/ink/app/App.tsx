import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import type { VersionInvocationTarget } from '../../commands/version.js';
import {
  allocateAppScaffoldingLayout,
  isMinimumLayout,
  KEY_HINT_REGION_ROWS,
  STATUS_REGION_ROWS,
} from '../components/ContextContent.js';
import { KeyHintOverlay } from '../components/KeyHintOverlay.js';
import { QuitConfirmationDialog } from '../components/QuitConfirmationDialog.js';
import { StatusBar } from '../components/StatusBar.js';
import { useQuitConfirmation, isHomeRoute } from '../hooks/use-quit-confirmation.js';
import { useTerminalSize } from '../hooks/use-terminal-size.js';
import { AgentAddScreen } from '../screens/agents/agent-add.js';
import { AgentsListScreen } from '../screens/agents/agents-list.js';
import { AgentRemoveScreen } from '../screens/agents/agent-remove.js';
import { GlobalHomeScreen } from '../screens/global-home.js';
import { LocalHomeScreen } from '../screens/local-home.js';
import { ManageLocalScreen } from '../screens/manage/manage-local.js';
import { ManifestoViewScreen } from '../screens/manifesto/manifesto-view.js';
import { SetListDetailScreen } from '../screens/set-lists/set-list-detail.js';
import { SetListEditScreen } from '../screens/set-lists/set-list-edit.js';
import { SetListsListScreen } from '../screens/set-lists/set-lists-list.js';
import { ProjectHubScreen } from '../screens/project/project-hub.js';
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
import { RepositoryWorkflowReportDetailScreen } from '../screens/repository-workflows/repository-workflow-report-detail.js';
import { RepositoryWorkflowReportsListScreen } from '../screens/repository-workflows/repository-workflows-list.js';
import { SessionProvider, useSession } from './session-context.js';
import { supplementalHintsForRoute, titleForRoute, type RouteId } from './navigation.js';
import type { RoutedScreenProps } from './routed-screen-props.js';

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
 * Minimum route content rows required before the normal shell layout is considered usable.
 */
const MINIMUM_ROUTE_CONTENT_ROWS = 1;

/**
 * Props shared by routed screens rendered inside the route content slot.
 */
type RouteRendererProps = RoutedScreenProps;

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
 * @param props - Current route id and route slot row budget.
 * @returns React element for a deferred screen.
 */
function PlaceholderScreen(props: RoutedScreenProps & { routeId: RouteId }): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
    >
      <Text bold>{titleForRoute(props.routeId)}</Text>
      <Text color="gray">This screen is reserved for a later implementation phase.</Text>
    </Box>
  );
}

/**
 * Routes the current session route id to its screen component inside the route content slot.
 *
 * @param props - Route slot row budget passed to the active screen.
 * @returns React element for the active route.
 */
function RouteRenderer(props: RouteRendererProps): React.ReactElement {
  const session = useSession();
  const routeProps: RoutedScreenProps = { routeContentRows: props.routeContentRows };

  switch (session.routeId) {
    case 'specs-list':
      return <SpecsListScreen {...routeProps} />;
    case 'spec-detail':
      return <SpecDetailScreen {...routeProps} />;
    case 'spec-mutations':
      return <SpecMutationsScreen {...routeProps} />;
    case 'task-status-set':
      return <TaskStatusSetScreen {...routeProps} />;
    case 'task-checkbox-set':
      return <TaskCheckboxSetScreen {...routeProps} />;
    case 'workflow-state':
      return <WorkflowStateScreen {...routeProps} />;
    case 'workflows-list':
      return <WorkflowsListScreen {...routeProps} />;
    case 'workflow-detail':
      return <WorkflowDetailScreen {...routeProps} />;
    case 'agents-list':
      return <AgentsListScreen {...routeProps} />;
    case 'agent-add':
      return <AgentAddScreen {...routeProps} />;
    case 'agent-remove':
      return <AgentRemoveScreen {...routeProps} />;
    case 'project-metadata-view':
      return <ProjectMetadataViewScreen {...routeProps} />;
    case 'project-metadata-edit':
      return <ProjectMetadataEditScreen {...routeProps} />;
    case 'setup-menu':
      return <SetupMenuScreen {...routeProps} />;
    case 'setup-init':
      return <SetupInitScreen {...routeProps} />;
    case 'setup-version':
      return <SetupVersionScreen {...routeProps} />;
    case 'setup-update':
      return <SetupUpdateScreen {...routeProps} />;
    case 'setup-step-instantiate':
      return <StepInstantiateScreen {...routeProps} />;
    case 'setup-frontmatter-update':
      return <SpecFrontmatterUpdateScreen {...routeProps} />;
    case 'global-home':
      return <GlobalHomeScreen {...routeProps} />;
    case 'local-home':
      return <LocalHomeScreen {...routeProps} />;
    case 'project-hub':
      return <ProjectHubScreen {...routeProps} />;
    case 'manage-local':
      return <ManageLocalScreen {...routeProps} />;
    case 'manifesto-view':
      return <ManifestoViewScreen {...routeProps} />;
    case 'set-lists-list':
      return <SetListsListScreen {...routeProps} />;
    case 'set-list-detail':
      return <SetListDetailScreen {...routeProps} />;
    case 'set-list-edit':
      return <SetListEditScreen {...routeProps} />;
    case 'repository-workflows-list':
      return <RepositoryWorkflowReportsListScreen {...routeProps} />;
    case 'repository-workflow-report-detail':
      return <RepositoryWorkflowReportDetailScreen {...routeProps} />;
    default:
      return <PlaceholderScreen routeId={session.routeId} {...routeProps} />;
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
  const quit = useQuitConfirmation(() => {
    app.exit();
  });
  const { rows: terminalRows } = useTerminalSize();
  const [showHints, setShowHints] = useState(true);
  const keyHintRows = showHints ? KEY_HINT_REGION_ROWS : 0;
  const layout = allocateAppScaffoldingLayout({
    terminalRows,
    statusRows: STATUS_REGION_ROWS,
    keyHintRows,
    minimumRouteContentRows: MINIMUM_ROUTE_CONTENT_ROWS,
  });
  const onHomeScreen = isHomeRoute(session.routeId);

  useInput((input, key) => {
    if (input === 'q') {
      if (quit.pending && quit.triggerKey !== 'q') {
        quit.onOtherKey();
        return;
      }

      quit.onQuitKey('q');
      return;
    }

    if (quit.pending) {
      if (key.escape && quit.triggerKey === 'escape') {
        quit.onQuitKey('escape');
        return;
      }

      quit.onOtherKey();
      return;
    }

    if (input === '?' || (key.shift && input === '/')) {
      setShowHints((current) => !current);
      return;
    }

    if (input === 'b' || key.escape) {
      if (onHomeScreen && key.escape) {
        quit.onQuitKey('escape');
        return;
      }

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
      <Box flexShrink={0} height={layout.statusRows}>
        <StatusBar />
      </Box>
      <Box
        flexGrow={1}
        flexShrink={1}
        flexDirection="column"
        height={layout.routeContentRows}
        width="100%"
        backgroundColor="black"
      >
        <RouteRenderer routeContentRows={layout.routeContentRows} />
        {quit.pending && quit.message != null ? (
          <Box position="absolute" height={layout.routeContentRows} width="100%">
            <QuitConfirmationDialog message={quit.message} />
          </Box>
        ) : null}
      </Box>
      {layout.keyHintRows > 0 ? (
        <Box flexShrink={0} height={layout.keyHintRows}>
          <KeyHintOverlay
            visible={showHints}
            supplementalHints={supplementalHintsForRoute(session.routeId)}
          />
        </Box>
      ) : null}
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
