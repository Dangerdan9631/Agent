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
    <Box paddingX={1} borderStyle="single">
      <Text color="cyan">q quit | b/Esc back | ? toggle keys | arrows move | Enter select</Text>
    </Box>
  );
}
