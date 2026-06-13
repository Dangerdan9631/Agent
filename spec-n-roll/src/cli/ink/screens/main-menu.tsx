import React from 'react';
import { Box, Text, useInput } from 'ink';

import { SelectableList, type SelectableListItem } from '../components/SelectableList.js';
import { useSession } from '../app/session-context.js';
import type { RouteId } from '../app/navigation.js';

/**
 * Main menu entry describing a top-level interactive section.
 */
interface MainMenuItem extends SelectableListItem {
  /**
   * Route id entered when the item is selected.
   */
  routeId: RouteId;
  /**
   * Number key that activates this item from the menu.
   */
  key: string;
  /**
   * Whether this route remains useful before project initialization.
   */
  availableWhenUninitialized: boolean;
}

/**
 * Top-level menu entries in numeric keyboard order.
 */
const MAIN_MENU_ITEMS: readonly MainMenuItem[] = [
  {
    id: 'specs',
    key: '1',
    label: '1 Task Specs',
    description: 'Browse specs and task-specific actions',
    routeId: 'specs-list',
    availableWhenUninitialized: false,
  },
  {
    id: 'workflows',
    key: '2',
    label: '2 Workflows',
    description: 'Inspect configured workflow variants',
    routeId: 'workflows-list',
    availableWhenUninitialized: false,
  },
  {
    id: 'agents',
    key: '3',
    label: '3 Agents',
    description: 'Inspect bundled and configured agents',
    routeId: 'agents-list',
    availableWhenUninitialized: true,
  },
  {
    id: 'project',
    key: '4',
    label: '4 Project',
    description: 'Inspect project metadata',
    routeId: 'project-metadata-view',
    availableWhenUninitialized: false,
  },
  {
    id: 'setup',
    key: '5',
    label: '5 Setup / Maintenance',
    description: 'Initialize or maintain the toolkit project',
    routeId: 'setup-menu',
    availableWhenUninitialized: true,
  },
];

/**
 * Applies initialization availability to main menu entries.
 *
 * @param isInitialized - Whether the current project is initialized.
 * @returns Menu items with disabled state applied.
 */
function buildMenuItems(isInitialized: boolean): readonly MainMenuItem[] {
  return MAIN_MENU_ITEMS.map((item) => ({
    ...item,
    disabled: !isInitialized && !item.availableWhenUninitialized,
  }));
}

/**
 * Renders the five-section interactive main menu.
 *
 * @returns React element for the main menu screen.
 */
export function MainMenu(): React.ReactElement {
  const session = useSession();
  const items = buildMenuItems(session.isInitialized);

  const openItem = (item: MainMenuItem): void => {
    if (item.disabled === true) {
      return;
    }
    session.pushRoute(item.routeId);
  };

  useInput((input) => {
    const item = items.find((candidate) => candidate.key === input);
    if (item != null) {
      openItem(item);
    }
  });

  return (
    <Box flexDirection="column">
      {!session.isInitialized ? (
        <Text color="yellow">
          Project is not initialized. Open Setup / Maintenance to initialize.
        </Text>
      ) : null}
      <SelectableList items={items} onSelect={openItem} />
    </Box>
  );
}
