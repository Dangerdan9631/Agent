import React, { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RouteId } from '../../app/navigation.js';
import type { SelectedContextChangeHandler } from '../../app/App.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { useSelectionRowContribution } from '../../components/SelectionRegion.js';

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
export interface SetupMenuScreenProps {
  /**
   * Called when keyboard focus moves to a setup action with read-only context.
   */
  onContextChange?: SelectedContextChangeHandler;
}

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
 * @returns React element for the setup menu screen.
 */
export function SetupMenuScreen(props: SetupMenuScreenProps): React.ReactElement {
  const session = useSession();
  const openItem = useCallback(
    (item: SetupMenuItem): void => {
      session.pushRoute(item.routeId);
    },
    [session],
  );
  const reportFocusedContext = useCallback(
    (item: SetupMenuItem | undefined): void => {
      props.onContextChange?.(item?.context);
    },
    [props.onContextChange],
  );
  useSelectionRowContribution(1);

  useInput((input) => {
    const item = SETUP_MENU_ITEMS.find((candidate) => candidate.key === input);
    if (item != null) {
      openItem(item);
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Setup / Maintenance</Text>
      <SelectableList
        items={SETUP_MENU_ITEMS}
        onFocusChange={reportFocusedContext}
        onSelect={openItem}
      />
    </Box>
  );
}
