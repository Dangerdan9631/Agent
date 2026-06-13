import React from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * Props for a reusable confirmation dialog.
 */
export interface ConfirmDialogProps {
  /**
   * Short confirmation title.
   */
  title: string;
  /**
   * Plain-English description of the action being confirmed.
   */
  message: string;
  /**
   * Called when the user confirms with y or Enter.
   */
  onConfirm: () => void;
  /**
   * Called when the user cancels with n or Escape.
   */
  onCancel: () => void;
}

/**
 * Renders a keyboard confirmation gate for destructive or important actions.
 *
 * @param props - Confirmation copy and callbacks.
 * @returns React element for a confirmation prompt.
 */
export function ConfirmDialog(props: ConfirmDialogProps): React.ReactElement {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y' || key.return) {
      props.onConfirm();
      return;
    }

    if (input.toLowerCase() === 'n' || key.escape) {
      props.onCancel();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>{props.title}</Text>
      <Text>{props.message}</Text>
      <Text color="gray">Y/Enter confirm, N/Esc cancel</Text>
    </Box>
  );
}
