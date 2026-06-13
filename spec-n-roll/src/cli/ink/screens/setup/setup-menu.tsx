import React, { useCallback, useMemo, useState } from 'react';
import { Box, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RouteId } from '../../app/navigation.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import type {
  ContextContentState,
  SelectedOptionContext,
} from '../../components/ContextContent.js';

/**
 * Setup and maintenance command row shown from the setup menu.
 */
interface SetupMenuItem extends SelectableListItem {
  /**
   * Route entered when the setup command is selected.
   */
  routeId: RouteId;
  /**
   * Number key that activates this setup command from the menu.
   */
  key: string;
}

/**
 * Props for the setup menu screen.
 */
export type SetupMenuScreenProps = RoutedScreenProps;

/**
 * Setup and maintenance operations exposed by User Story 3.
 */
const SETUP_MENU_ITEMS: readonly SetupMenuItem[] = [
  {
    id: 'init',
    key: '1',
    label: '1 Initialize project',
    description: 'init',
    routeId: 'setup-init',
    context: {
      id: 'setup:init',
      title: 'Initialize Project',
      summary: 'Create missing toolkit configuration for this project.',
      status: 'Useful when workflow configuration is missing or incomplete.',
      details: ['Initializes project-level workflow and metadata assets.'],
      nextStep: 'Open the initialization screen.',
    },
  },
  {
    id: 'version',
    key: '2',
    label: '2 Version info',
    description: 'version',
    routeId: 'setup-version',
    context: {
      id: 'setup:version',
      title: 'Version Info',
      summary: 'Inspect CLI version and binary resolution details.',
      status: 'Read-only diagnostic operation.',
      details: ['Shows whether the session uses a global or project-local binary.'],
      nextStep: 'Open the version information screen.',
    },
  },
  {
    id: 'update',
    key: '3',
    label: '3 Update toolkit',
    description: 'update / update --dry-run',
    routeId: 'setup-update',
    context: {
      id: 'setup:update',
      title: 'Update Toolkit',
      summary: 'Run or preview toolkit maintenance updates.',
      status: 'May change project files only after explicit activation.',
      details: ['Supports update and dry-run update flows.'],
      nextStep: 'Open the update screen.',
    },
  },
];

/**
 * Renders project setup and toolkit maintenance entry points.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the setup menu screen.
 */
export function SetupMenuScreen(props: SetupMenuScreenProps): React.ReactElement {
  const session = useSession();
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const contextState = useMemo(
    (): ContextContentState => ({
      routeTitle: 'Setup / Maintenance',
      fallbackSummary: 'Initialize or maintain the toolkit project.',
      selectedContext,
    }),
    [selectedContext],
  );
  const openItem = useCallback(
    (item: SetupMenuItem): void => {
      session.pushRoute(item.routeId);
    },
    [session],
  );
  const reportFocusedContext = useCallback((item: SetupMenuItem | undefined): void => {
    setSelectedContext(item?.context);
  }, []);

  useInput((input) => {
    const item = SETUP_MENU_ITEMS.find((candidate) => candidate.key === input);
    if (item != null) {
      openItem(item);
    }
  });

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        <Box flexDirection="column">
          <SelectableList
            items={SETUP_MENU_ITEMS}
            onFocusChange={reportFocusedContext}
            onSelect={openItem}
          />
        </Box>
      }
    />
  );
}
