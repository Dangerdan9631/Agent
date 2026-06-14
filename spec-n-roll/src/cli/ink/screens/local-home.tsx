import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import { useSession } from '../app/session-context.js';
import type { RouteId } from '../app/navigation.js';
import { RouteContentLayout } from '../components/RouteContentLayout.js';
import { SelectableList, type SelectableListItem } from '../components/SelectableList.js';
import { StaticContentBlock } from '../components/StaticContentBlock.js';
import type { RoutedScreenProps } from '../app/routed-screen-props.js';
import { loadLocalHomeContent, type LocalHomeContent } from '../read-models/local-home-content.js';

/**
 * Local home menu row with numeric shortcut activation.
 */
interface LocalHomeMenuItem extends SelectableListItem {
  /**
   * Number key that activates this menu option.
   */
  key: string;
  /**
   * Stable action identifier for selection handling.
   */
  actionId: 'project' | 'agents' | 'workflows' | 'extensions' | 'manage' | 'quit';
  /**
   * Child route entered when the option is selected, if any.
   */
  routeId?: RouteId;
}

/**
 * Props for the local instance home screen.
 */
export type LocalHomeScreenProps = RoutedScreenProps;

/**
 * Builds local home menu rows in numeric keyboard order.
 *
 * @returns Menu items with Extensions permanently disabled.
 */
function buildMenuItems(): readonly LocalHomeMenuItem[] {
  return [
    {
      id: 'project',
      key: '1',
      actionId: 'project',
      routeId: 'project-hub',
      label: '1 Project',
      description: 'Open the project hub',
      disabled: false,
    },
    {
      id: 'agents',
      key: '2',
      actionId: 'agents',
      routeId: 'agents-list',
      label: '2 Agents',
      description: 'Inspect configured agents',
      disabled: false,
    },
    {
      id: 'workflows',
      key: '3',
      actionId: 'workflows',
      routeId: 'workflows-list',
      label: '3 Workflows',
      description: 'Inspect configured workflows',
      disabled: false,
    },
    {
      id: 'extensions',
      key: '4',
      actionId: 'extensions',
      label: '4 Extensions',
      description: 'Extensions are not available yet',
      disabled: true,
    },
    {
      id: 'manage',
      key: '5',
      actionId: 'manage',
      routeId: 'manage-local',
      label: "5 Manage Spec N' Roll",
      description: 'Manage local binary and project lifecycle',
      disabled: false,
    },
    {
      id: 'quit',
      key: '6',
      actionId: 'quit',
      label: '6 Quit',
      description: 'Exit the interactive CLI',
      disabled: false,
    },
  ];
}

/**
 * Renders stacked local home content blocks with blank lines between groups.
 *
 * @param content - Loaded local home read-model content.
 * @returns React element for the static content area.
 */
function renderLocalHomeContent(content: LocalHomeContent): React.ReactElement {
  return (
    <Box flexDirection="column">
      <StaticContentBlock fields={content.versionBlock} />
      {content.taskSummaryBlock != null ? (
        <>
          <Text> </Text>
          <StaticContentBlock fields={content.taskSummaryBlock} />
        </>
      ) : null}
      {content.currentTaskBlock != null ? (
        <>
          <Text> </Text>
          <StaticContentBlock fields={content.currentTaskBlock} />
        </>
      ) : null}
    </Box>
  );
}

/**
 * Renders the local instance home screen with static content and navigation options.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the local home screen.
 */
export function LocalHomeScreen(props: LocalHomeScreenProps): React.ReactElement {
  const session = useSession();
  const app = useApp();
  const [content, setContent] = useState<LocalHomeContent | null>(null);
  const menuItems = useMemo(() => buildMenuItems(), []);

  useEffect(() => {
    let cancelled = false;

    void loadLocalHomeContent({
      projectRoot: session.projectRoot,
    }).then((loaded) => {
      if (!cancelled) {
        setContent(loaded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session.projectRoot]);

  const handleMenuSelect = useCallback(
    (item: LocalHomeMenuItem): void => {
      switch (item.actionId) {
        case 'project':
        case 'agents':
        case 'workflows':
        case 'manage':
          if (item.routeId != null) {
            session.pushRoute(item.routeId);
          }
          return;
        case 'extensions':
          return;
        case 'quit':
          app.exit();
      }
    },
    [app, session],
  );

  useInput((input) => {
    const item = menuItems.find((candidate) => candidate.key === input);
    if (item != null) {
      handleMenuSelect(item);
    }
  });

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={{ routeTitle: 'Local Home' }}
      staticContent={
        <Box flexDirection="column">
          {content == null ? (
            <Text color="gray">Loading local home content...</Text>
          ) : (
            renderLocalHomeContent(content)
          )}
        </Box>
      }
      selection={
        <Box flexDirection="column">
          {content != null ? (
            <SelectableList items={menuItems} onSelect={handleMenuSelect} />
          ) : (
            <Text color="gray">Loading menu...</Text>
          )}
        </Box>
      }
    />
  );
}
