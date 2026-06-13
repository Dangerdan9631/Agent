import React, { useCallback, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { SelectableList, type SelectableListItem } from '../components/SelectableList.js';
import { useSelectionRowContribution } from '../components/SelectionRegion.js';
import { RouteContentLayout } from '../components/RouteContentLayout.js';
import type { ContextContentState, SelectedOptionContext } from '../components/ContextContent.js';
import { useSession } from '../app/session-context.js';
import type { RouteId } from '../app/navigation.js';
import type { RoutedScreenProps } from '../app/routed-screen-props.js';

/**
 * Main menu entry describing a top-level interactive section.
 */
interface MainMenuItem extends SelectableListItem {
  /**
   * Read-only context attached to the menu row. Every top-level section must describe itself.
   */
  context: NonNullable<SelectableListItem['context']>;
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
 * Props for the main menu screen.
 */
export type MainMenuProps = RoutedScreenProps;

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
    context: {
      id: 'main-menu:specs',
      title: 'Task Specs',
      summary: 'Review task specs and workflow progress.',
      status: 'Requires initialized project configuration.',
      details: ['Shows lifecycle status, workflow state, and recognized task spec directories.'],
      nextStep: 'Open the task specs browser.',
    },
  },
  {
    id: 'workflows',
    key: '2',
    label: '2 Workflows',
    description: 'Inspect configured workflow variants',
    routeId: 'workflows-list',
    availableWhenUninitialized: false,
    context: {
      id: 'main-menu:workflows',
      title: 'Workflows',
      summary: 'Inspect workflow variants and step order.',
      status: 'Requires initialized workflow configuration.',
      details: ['Shows configured workflow variants, defaults, and step sequences.'],
      nextStep: 'Open the workflows browser.',
    },
  },
  {
    id: 'agents',
    key: '3',
    label: '3 Agents',
    description: 'Inspect and configured agents',
    routeId: 'agents-list',
    availableWhenUninitialized: false,
    context: {
      id: 'main-menu:agents',
      title: 'Agents',
      summary: 'Inspect agents and project configuration.',
      status: 'Available before initialization.',
      details: ['Shows configured-only filtering and agent availability.'],
      nextStep: 'Open the agents browser.',
    },
  },
  {
    id: 'project',
    key: '4',
    label: '4 Project',
    description: 'Inspect project metadata',
    routeId: 'project-metadata-view',
    availableWhenUninitialized: false,
    context: {
      id: 'main-menu:project',
      title: 'Project Metadata',
      summary: 'Inspect current task ownership and id allocation.',
      status: 'Requires initialized project metadata.',
      details: ['Shows next task id, active task spec, and implementation start timestamp.'],
      nextStep: 'Open the project metadata view.',
    },
  },
  {
    id: 'setup',
    key: '5',
    label: '5 Setup / Maintenance',
    description: 'Initialize or maintain the toolkit project',
    routeId: 'setup-menu',
    availableWhenUninitialized: true,
    context: {
      id: 'main-menu:setup',
      title: 'Setup / Maintenance',
      summary: 'Initialize or maintain the toolkit project.',
      status: 'Available before initialization.',
      details: ['Provides initialization, version, and update maintenance actions.'],
      nextStep: 'Open setup and maintenance options.',
    },
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
    context:
      !isInitialized && !item.availableWhenUninitialized
        ? {
            ...item.context,
            status: 'Unavailable until setup initializes the project.',
            warnings: ['Initialize the project before opening this section.'],
          }
        : item.context,
  }));
}

/**
 * Renders the uninitialized-project warning inside the selection sub-region.
 */
function UninitializedWarning(): React.ReactElement {
  useSelectionRowContribution(1);

  return (
    <Text color="yellow">Project is not initialized. Open Setup / Maintenance to initialize.</Text>
  );
}

/**
 * Renders the five-section interactive main menu.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the main menu screen.
 */
export function MainMenu(props: MainMenuProps): React.ReactElement {
  const session = useSession();
  const items = useMemo(() => buildMenuItems(session.isInitialized), [session.isInitialized]);
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const contextState = useMemo(
    (): ContextContentState => ({
      routeTitle: 'Main Menu',
      fallbackSummary: 'Choose a section to open.',
      selectedContext,
    }),
    [selectedContext],
  );

  const openItem = useCallback(
    (item: MainMenuItem): void => {
      if (item.disabled === true) {
        return;
      }
      session.pushRoute(item.routeId);
    },
    [session],
  );
  const reportFocusedContext = useCallback((item: MainMenuItem | undefined): void => {
    setSelectedContext(item?.context);
  }, []);

  useInput((input) => {
    const item = items.find((candidate) => candidate.key === input);
    if (item != null) {
      openItem(item);
    }
  });

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        <Box flexDirection="column" flexGrow={0} flexShrink={0} width="100%">
          {!session.isInitialized ? <UninitializedWarning /> : null}
          <SelectableList items={items} onFocusChange={reportFocusedContext} onSelect={openItem} />
        </Box>
      }
    />
  );
}
