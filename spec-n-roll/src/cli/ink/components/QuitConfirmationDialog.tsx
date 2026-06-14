import React from 'react';
import { Box, Text } from 'ink';

import { QUIT_CONFIRMATION_CANCEL_MESSAGE } from '../hooks/use-quit-confirmation.js';

/**
 * Inner character width used to paint the dialog body background.
 */
const DIALOG_INNER_WIDTH = 40;

/**
 * Pads one dialog row so the full interior receives the same background color.
 *
 * @param text - Row text to center inside the dialog. Must fit within the dialog width.
 * @returns Text padded to the dialog's fixed inner width.
 */
function centerDialogLine(text: string): string {
  const availablePadding = Math.max(DIALOG_INNER_WIDTH - text.length, 0);
  const leftPadding = Math.floor(availablePadding / 2);
  const rightPadding = availablePadding - leftPadding;
  return `${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}`;
}

/**
 * Props for the centered quit confirmation dialog.
 */
export interface QuitConfirmationDialogProps {
  /**
   * Primary confirmation message naming the key that exits. Must be non-empty.
   */
  message: string;
}

/**
 * Renders the transient quit confirmation as a prominent centered dialog.
 *
 * @param props - Confirmation message to display above the cancellation hint.
 * @returns React element for the quit confirmation dialog.
 */
export function QuitConfirmationDialog(props: QuitConfirmationDialogProps): React.ReactElement {
  return (
    <Box alignItems="center" flexGrow={1} justifyContent="center" width="100%">
      <Box
        flexDirection="column"
        borderStyle="round"
        backgroundColor="black"
        borderBackgroundColor="black"
        paddingY={1}
      >
        <Text bold color="yellow">
          {centerDialogLine(props.message)}
        </Text>
        <Text color="gray">
          {centerDialogLine(QUIT_CONFIRMATION_CANCEL_MESSAGE)}
        </Text>
      </Box>
    </Box>
  );
}
