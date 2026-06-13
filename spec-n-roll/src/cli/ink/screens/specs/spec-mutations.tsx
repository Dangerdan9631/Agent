import React from 'react';
import { Box, Text } from 'ink';

import { useSession } from '../../app/session-context.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import type { RouteId } from '../../app/navigation.js';

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
 * Renders shortcuts to mutation flows for the selected task spec.
 *
 * @returns React element for the task mutation submenu.
 */
export function SpecMutationsScreen(): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;

  const openMutation = (item: SpecMutationItem): void => {
    session.pushRoute(item.routeId, selected?.label);
  };

  return (
    <Box flexDirection="column">
      <Text bold>Spec Mutations</Text>
      {selected == null ? (
        <Text color="yellow">No task spec is selected.</Text>
      ) : (
        <>
          <Text color="gray">target: {selected.label}</Text>
          <SelectableList items={SPEC_MUTATION_ITEMS} onSelect={openMutation} />
        </>
      )}
    </Box>
  );
}
