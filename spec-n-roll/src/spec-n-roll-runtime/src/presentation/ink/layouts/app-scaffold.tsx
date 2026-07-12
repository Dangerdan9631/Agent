import React from 'react';
import { Box, Text } from 'ink';

/**
 * Describes the fixed application chrome and route-owned layout slot.
 */
export interface AppScaffoldProps {
  /** Title displayed in the fixed top bar. */
  readonly title: string;
  /** Total terminal rows reserved by the enclosing Ink application. */
  readonly terminalRows: number;
  /** Total terminal columns available to the enclosing Ink application. */
  readonly terminalColumns: number;
  /** Fixed height of the title bar in terminal rows. */
  readonly titleRows: number;
  /** Height available exclusively to the route-selected layout. */
  readonly routeLayoutRows: number;
  /** Fixed height of the key-hint bar in terminal rows. */
  readonly hintRows: number;
  /** Whether the current route can return to its previous route with Escape. */
  readonly backEnabled: boolean;
  /** Layout selected by the active route. */
  readonly routeLayout: React.ReactNode;
}

/**
 * Renders the stable title and hint bars around a route-defined layout slot.
 *
 * @param props - Terminal allocation, active title, and selected route layout.
 * @returns Full-height application chrome containing the route layout.
 */
export function AppScaffold(props: AppScaffoldProps): React.ReactElement {
  return (
    <Box
      height={props.terminalRows}
      width={props.terminalColumns}
      flexDirection="column"
      overflow="hidden"
    >
      <Box
        height={props.titleRows}
        flexShrink={0}
        borderStyle="single"
        paddingX={1}
      >
        <Text bold>Spec N' Roll · {props.title}</Text>
      </Box>
      <Box
        height={props.routeLayoutRows}
        flexDirection="column"
        flexShrink={0}
        overflow="hidden"
      >
        {props.routeLayout}
      </Box>
      <Box
        height={props.hintRows}
        flexShrink={0}
        borderStyle="single"
        paddingX={1}
      >
        <Text color="gray">
          Page Up/Down scroll{props.backEnabled ? ' · Esc back' : ''}
        </Text>
      </Box>
    </Box>
  );
}
