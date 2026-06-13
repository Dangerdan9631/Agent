import React from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RouteId } from '../../app/navigation.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';

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
 * Setup and maintenance operations exposed by User Story 3.
 */
const SETUP_MENU_ITEMS: readonly SetupMenuItem[] = [
  {
    id: 'init',
    key: '1',
    label: '1 Initialize project',
    description: 'init',
    routeId: 'setup-init',
  },
  {
    id: 'version',
    key: '2',
    label: '2 Version info',
    description: 'version',
    routeId: 'setup-version',
  },
  {
    id: 'update',
    key: '3',
    label: '3 Update toolkit',
    description: 'update / update --dry-run',
    routeId: 'setup-update',
  },
];

/**
 * Renders project setup and toolkit maintenance entry points.
 *
 * @returns React element for the setup menu screen.
 */
export function SetupMenuScreen(): React.ReactElement {
  const session = useSession();
  const openItem = (item: SetupMenuItem): void => {
    session.pushRoute(item.routeId);
  };

  useInput((input) => {
    const item = SETUP_MENU_ITEMS.find((candidate) => candidate.key === input);
    if (item != null) {
      openItem(item);
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Setup / Maintenance</Text>
      <SelectableList items={SETUP_MENU_ITEMS} onSelect={openItem} />
    </Box>
  );
}
