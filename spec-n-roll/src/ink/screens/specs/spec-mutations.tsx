import React, { useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { homeRouteIdFor, type RouteId } from '../../app/navigation.js';
import {
  appendBackMenuItem,
  isBackMenuItem,
  type BackMenuItem,
} from '../../components/menu/back-menu-item.js';

/**
 * Selectable task-specific mutation command shown from a selected spec.
 */
interface SpecMutationItem extends SelectableListItem {
  /**
   * Route id for the mutation screen entered by this row.
   */
  routeId: RouteId;
}

/**
 * Task-specific mutation entries supported by User Story 2.
 */
const SPEC_MUTATION_ITEMS: readonly SpecMutationItem[] = [
  {
    id: 'status',
    label: 'Set lifecycle status',
    description: 'task.status.set',
    routeId: 'task-status-set',
  },
  {
    id: 'checkbox',
    label: 'Set task checkbox',
    description: 'task.checkbox.set',
    routeId: 'task-checkbox-set',
  },
  {
    id: 'workflow',
    label: 'Write workflow state',
    description: 'workflow.state.write',
    routeId: 'workflow-state',
  },
  {
    id: 'step-instantiate',
    label: 'Instantiate step output',
    description: 'step.instantiate',
    routeId: 'setup-step-instantiate',
  },
  {
    id: 'frontmatter-update',
    label: 'Update spec frontmatter',
    description: 'spec.frontmatter.update',
    routeId: 'setup-frontmatter-update',
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
 * Renders shortcuts to mutation flows for the selected task spec.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the task mutation submenu.
 */
export function SpecMutationsScreen(props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;
  const slotHeight = props.routeContentRows > 0 ? props.routeContentRows : undefined;
  const items = useMemo(
    (): readonly (SpecMutationItem | BackMenuItem)[] =>
      appendBackMenuItem(
        SPEC_MUTATION_ITEMS,
        parentRouteId(session.navigationStack, session.binaryContext),
      ),
    [session.binaryContext, session.navigationStack],
  );
  const backItem = useMemo(
    () => items.find((item): item is BackMenuItem => isBackMenuItem(item)),
    [items],
  );

  const openMutation = useCallback(
    (item: SpecMutationItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
        return;
      }

      session.pushRoute(item.routeId, selected?.label);
    },
    [selected?.label, session],
  );

  useInput((input) => {
    if (backItem != null && input === backItem.key) {
      session.popRoute();
      return;
    }

    const index = Number.parseInt(input, 10);
    if (!Number.isNaN(index) && index >= 1 && index <= SPEC_MUTATION_ITEMS.length) {
      const item = SPEC_MUTATION_ITEMS[index - 1];
      if (item != null) {
        openMutation(item);
      }
    }
  });

  return (
    <Box flexDirection="column" height={slotHeight}>
      <Text bold>Spec Mutations</Text>
      {selected == null ? (
        <Text color="yellow">No task spec is selected.</Text>
      ) : (
        <>
          <Text color="gray">target: {selected.label}</Text>
          <SelectableList items={items} onSelect={openMutation} />
        </>
      )}
    </Box>
  );
}
