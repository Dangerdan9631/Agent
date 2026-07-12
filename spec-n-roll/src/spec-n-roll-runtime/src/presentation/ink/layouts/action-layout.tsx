import React from 'react';
import { Box } from 'ink';
import {
  MenuList,
  type MenuItem,
} from '#runtime/presentation/ink/menu-list.jsx';

/**
 * Describes a route layout with a content region and keyboard-selected actions.
 */
export interface ActionLayoutProps {
  /** Total rows allocated to this route layout. */
  readonly rows: number;
  /** Ordered actions shown beneath the content region. */
  readonly actions: readonly MenuItem[];
  /** Handles activation of an enabled action when actions are present. */
  readonly onActionSelect?: (action: MenuItem) => void;
  /** Content displayed above the action selection region. */
  readonly content: React.ReactNode;
}

/**
 * Renders content above a separated action selection list within one route slot.
 *
 * @param props - Row budget, route content, and selectable action definitions.
 * @returns Route-owned action and content layout.
 */
export function ActionLayout(props: ActionLayoutProps): React.ReactElement {
  const hasActions = props.actions.length > 0 && props.onActionSelect != null;
  const actionRows = hasActions ? props.actions.length + 1 : 0;
  const contentRows = Math.max(1, props.rows - actionRows);

  return (
    <Box flexDirection="column" height={props.rows}>
      <Box
        flexDirection="column"
        height={contentRows}
        overflow="hidden"
        paddingX={2}
      >
        {props.content}
      </Box>
      {hasActions ? (
        <>
          <Box
            borderStyle="single"
            borderBottom={false}
            borderLeft={false}
            borderRight={false}
            height={1}
            width="100%"
          />
          <MenuList items={props.actions} onSelect={props.onActionSelect} />
        </>
      ) : null}
    </Box>
  );
}
