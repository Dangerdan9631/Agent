import React, { useMemo, useState } from 'react';
import { Box } from 'ink';

import { useTerminalSize } from '../hooks/use-terminal-size.js';
import {
  allocateRouteContentLayout,
  ContextContent,
  type ContextContentState,
} from './ContextContent.js';
import { SelectionRowProvider } from './SelectionRegion.js';

/**
 * Minimum rows required for the content sub-region during normal route layout rendering.
 */
const MINIMUM_CONTENT_ROWS = 1;

/**
 * Props for the reusable route content layout that combines content and selection sub-regions.
 */
export interface RouteContentLayoutProps {
  /**
   * Rows allocated by app scaffolding to the active route content slot. Must be zero or greater.
   */
  routeContentRows: number;
  /**
   * Read-only context state for the upper content sub-region.
   */
  contextState: ContextContentState;
  /**
   * Selection list slot rendered in the lower sub-region. May report row requirements through selection providers.
   */
  selection: React.ReactNode;
}

/**
 * Composes route-owned content above a bottom selection list sized to visible option rows.
 *
 * @param props - Route slot row budget, context state, and selection slot content.
 * @returns React element reserving the route content layout regions.
 */
export function RouteContentLayout(props: RouteContentLayoutProps): React.ReactElement {
  const [selectionRows, setSelectionRows] = useState(1);
  const { columns: inkColumns } = useTerminalSize();
  const columns = process.stdout.columns ?? inkColumns;
  const layout = useMemo(
    () =>
      allocateRouteContentLayout({
        routeContentRows: props.routeContentRows,
        selectionRows,
        minimumContentRows: MINIMUM_CONTENT_ROWS,
      }),
    [props.routeContentRows, selectionRows],
  );
  const contentState = useMemo(
    (): ContextContentState => ({
      ...props.contextState,
      availableRows: layout.contentRows,
    }),
    [layout.contentRows, props.contextState],
  );

  return (
    <Box
      flexDirection="column"
      height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      width={columns}
    >
      <Box
        flexGrow={1}
        flexShrink={1}
        height={layout.contentRows > 0 ? layout.contentRows : undefined}
        width={columns}
      >
        <ContextContent state={contentState} />
      </Box>
      <Box flexGrow={0} flexShrink={0} width={columns}>
        <SelectionRowProvider onRowCountChange={setSelectionRows}>
          {props.selection}
        </SelectionRowProvider>
      </Box>
    </Box>
  );
}
