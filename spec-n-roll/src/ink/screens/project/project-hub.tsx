import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RouteId } from '../../app/navigation.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { buildBackMenuItem } from '../../components/menu/back-menu-item.js';
import { StaticContentBlock } from '../../components/StaticContentBlock.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { loadProjectHubView, type ProjectHubView } from '../../read-models/project-hub.js';

/**
 * Project hub menu row with numeric shortcut activation.
 */
interface ProjectHubMenuItem extends SelectableListItem {
  /**
   * Number key that activates this menu option.
   */
  key: string;
  /**
   * Stable action identifier for selection handling.
   */
  actionId:
    | 'specs'
    | 'project-metadata'
    | 'manifesto'
    | 'set-lists'
    | 'repository-workflows'
    | 'back';
  /**
   * Child route entered when the option is selected, if any.
   */
  routeId?: RouteId;
}

/**
 * Props for the project hub screen.
 */
export type ProjectHubScreenProps = RoutedScreenProps;

/**
 * Builds project hub menu rows in numeric keyboard order.
 *
 * @returns Menu items for specs, project metadata, and back navigation.
 */
function buildMenuItems(): readonly ProjectHubMenuItem[] {
  const back = buildBackMenuItem({ key: '6', routeId: 'local-home' });

  return [
    {
      id: 'specs',
      key: '1',
      actionId: 'specs',
      routeId: 'specs-list',
      label: '1 Specs',
      description: 'Browse task specs',
      disabled: false,
    },
    {
      id: 'project-metadata',
      key: '2',
      actionId: 'project-metadata',
      routeId: 'project-metadata-view',
      label: '2 Project Metadata',
      description: 'Inspect project metadata',
      disabled: false,
    },
    {
      id: 'manifesto',
      key: '3',
      actionId: 'manifesto',
      routeId: 'manifesto-view',
      label: '3 Spec Manifestos',
      description: 'View global and step manifestos',
      disabled: false,
    },
    {
      id: 'set-lists',
      key: '4',
      actionId: 'set-lists',
      routeId: 'set-lists-list',
      label: '4 Set Lists',
      description: 'Browse and edit set list triage configuration',
      disabled: false,
    },
    {
      id: 'repository-workflows',
      key: '5',
      actionId: 'repository-workflows',
      routeId: 'repository-workflows-list',
      label: '5 Repository Workflow Reports',
      description: 'Browse onboarding and drift workflow reports',
      disabled: false,
    },
    {
      ...back,
      actionId: 'back',
      description: 'Return to local home',
      disabled: false,
    },
  ];
}

/**
 * Renders the project hub screen with spec summary content and navigation options.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the project hub screen.
 */
export function ProjectHubScreen(props: ProjectHubScreenProps): React.ReactElement {
  const session = useSession();
  const [view, setView] = useState<ProjectHubView | null>(null);
  const menuItems = useMemo(() => buildMenuItems(), []);

  useEffect(() => {
    let cancelled = false;

    void loadProjectHubView({
      projectRoot: session.projectRoot,
    }).then((loaded) => {
      if (!cancelled) {
        setView(loaded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session.projectRoot]);

  const handleMenuSelect = useCallback(
    (item: ProjectHubMenuItem): void => {
      switch (item.actionId) {
        case 'specs':
        case 'project-metadata':
        case 'manifesto':
        case 'set-lists':
        case 'repository-workflows':
          if (item.routeId != null) {
            session.pushRoute(item.routeId);
          }
          return;
        case 'back':
          session.popRoute();
      }
    },
    [session],
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
      contextState={{ routeTitle: 'Project' }}
      staticContent={
        <Box flexDirection="column">
          {view == null ? (
            <Text color="gray">Loading project summary...</Text>
          ) : (
            <StaticContentBlock fields={view.summaryBlock} />
          )}
        </Box>
      }
      selection={
        <Box flexDirection="column">
          {view != null ? (
            <SelectableList items={menuItems} onSelect={handleMenuSelect} />
          ) : (
            <Text color="gray">Loading menu...</Text>
          )}
        </Box>
      }
    />
  );
}
