import React from 'react';
import { Box, Text } from 'ink';

import { useTerminalSize } from '../hooks/use-terminal-size.js';
import type { KeyHintDescriptor } from '../app/navigation.js';

/**
 * Props for the global keyboard hint overlay.
 */
export interface KeyHintOverlayProps {
  /**
   * Whether hint text should render in the overlay row.
   */
  visible: boolean;
  /**
   * Optional route-specific hints merged after global defaults.
   */
  supplementalHints?: readonly KeyHintDescriptor[];
}

/**
 * Default keyboard shortcuts available on every interactive route.
 */
const GLOBAL_KEY_HINTS: readonly KeyHintDescriptor[] = [
  { key: 'q', label: 'quit' },
  { key: 'b/Esc', label: 'back' },
  { key: '?', label: 'toggle keys' },
  { key: 'arrows', label: 'move' },
  { key: 'Enter', label: 'select' },
];

/**
 * Merges global defaults with optional route-specific supplemental hints.
 *
 * @param supplementalHints - Route hints appended after global defaults.
 * @returns Ordered hint descriptors for overlay rendering.
 */
function mergeKeyHints(
  supplementalHints?: readonly KeyHintDescriptor[],
): readonly KeyHintDescriptor[] {
  if (supplementalHints == null || supplementalHints.length === 0) {
    return GLOBAL_KEY_HINTS;
  }

  return [...GLOBAL_KEY_HINTS, ...supplementalHints];
}

/**
 * Formats hint descriptors into a single plain-text line.
 *
 * @param hints - Ordered hint descriptors to join.
 * @returns Space-delimited hint text without color codes.
 */
function formatHintLine(hints: readonly KeyHintDescriptor[]): string {
  return hints.map((hint) => `${hint.key} ${hint.label}`).join(' | ');
}

/**
 * Renders keyboard shortcuts in a single-row region with horizontally centered content.
 *
 * @param props - Visibility state and optional route-specific hints.
 * @returns React element for centered hint text, or nothing when hints are hidden.
 */
export function KeyHintOverlay(props: KeyHintOverlayProps): React.ReactElement | null {
  const { columns: inkColumns } = useTerminalSize();
  const columns = process.stdout.columns ?? inkColumns;

  if (!props.visible) {
    return null;
  }

  const hints = mergeKeyHints(props.supplementalHints);
  const hintText = formatHintLine(hints);

  return (
    <Box alignItems="center" flexDirection="row" justifyContent="center" width={columns}>
      <Text color="cyan">{hintText}</Text>
    </Box>
  );
}
