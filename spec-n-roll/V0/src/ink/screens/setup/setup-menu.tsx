import React, { useCallback, useMemo, useState } from 'react';
import { Box, useInput } from 'ink';

import {
  appendBackMenuItem,
  isBackMenuItem,
  type BackMenuItem,
} from '../../components/menu/back-menu-item.js';
import { useSession } from '../../app/session-context.js';
import { homeRouteIdFor, type RouteId } from '../../app/navigation.js';
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
 * Resolves the parent route id used when building a Back row.
 *
 * @param navigationStack - Current navigation stack entries.
 * @param binaryContext - Active CLI invocation target.
 * @returns Parent route id for the Back row.
 */
function parentRouteId(
  navigationStack: readonly { routeId: RouteId }[],
  binaryContext: 'local' | 'global',
): RouteId {
  return navigationStack.at(-2)?.routeId ?? homeRouteIdFor(binaryContext);
}

/**
 * Setup and maintenance operations exposed by User Story 3.
 */
function buildSetupMenuItems(
  navigationStack: readonly { routeId: RouteId }[],
  binaryContext: 'local' | 'global',
): readonly (SetupMenuItem | BackMenuItem)[] {
  return appendBackMenuItem(SETUP_MENU_ITEMS, parentRouteId(navigationStack, binaryContext));
}

/**
 * Renders project setup and toolkit maintenance entry points.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the setup menu screen.
 */
export function SetupMenuScreen(props: SetupMenuScreenProps): React.ReactElement {
  const session = useSession();
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const menuItems = useMemo(
    () => buildSetupMenuItems(session.navigationStack, session.binaryContext),
    [session.binaryContext, session.navigationStack],
  );
  const backItem = useMemo(
    () => menuItems.find((item): item is BackMenuItem => isBackMenuItem(item)),
    [menuItems],
  );
  const contextState = useMemo(
    (): ContextContentState => ({
      routeTitle: 'Setup / Maintenance',
      selectedContext,
    }),
    [selectedContext],
  );
  const openItem = useCallback(
    (item: SetupMenuItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
        return;
      }

      session.pushRoute((item as SetupMenuItem).routeId);
    },
    [session],
  );
  const reportFocusedContext = useCallback(
    (item: SetupMenuItem | BackMenuItem | undefined): void => {
      if (item == null || isBackMenuItem(item)) {
        setSelectedContext(undefined);
        return;
      }

      setSelectedContext((item as SetupMenuItem).context);
    },
    [],
  );

  useInput((input) => {
    if (backItem != null && input === backItem.key) {
      session.popRoute();
      return;
    }

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
            items={menuItems}
            onFocusChange={reportFocusedContext}
            onSelect={openItem}
          />
        </Box>
      }
    />
  );
}
