import React from 'react';
import { Box, Text } from 'ink';

/**
 * Props for the global keyboard hint overlay.
 */
export interface KeyHintOverlayProps {
  /**
   * Whether the overlay should render into the application frame.
   */
  visible: boolean;
}

/**
 * Renders the global keyboard shortcuts available across interactive screens.
 *
 * @param props - Visibility state for the overlay.
 * @returns React element containing key hints, or an empty fragment when hidden.
 */
export function KeyHintOverlay(props: KeyHintOverlayProps): React.ReactElement {
  if (!props.visible) {
    return <></>;
  }

  return (
    <Box flexDirection="column">
      <Box padding={1} paddingX={0}>
        <Text color="cyan">q quit</Text>
        <Text color="white">{' | '}</Text>
        <Text color="cyan">b/Esc back</Text>
        <Text color="white">{' | '}</Text>
        <Text color="cyan">? toggle keys</Text>
        <Text color="white">{' | '}</Text>
        <Text color="cyan">arrows move</Text>
        <Text color="white">{' | '}</Text>
        <Text color="cyan">Enter select</Text>
      </Box>
    </Box>
  );
}
