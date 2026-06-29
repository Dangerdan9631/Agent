import React from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * Numbered option displayed by NumberedSelectionPrompt.
 */
export interface NumberedSelectionOption {
  /**
   * Stable option key.
   */
  id: string;
  /**
   * Human-readable option label.
   */
  label: string;
}

/**
 * Props for selecting one item by pressing its number.
 */
export interface NumberedSelectionPromptProps<TOption extends NumberedSelectionOption> {
  /**
   * Prompt title shown above numbered options.
   */
  title: string;
  /**
   * Options displayed in one-based numeric order.
   */
  options: readonly TOption[];
  /**
   * Called with the selected option after a valid number is pressed.
   */
  onSelect: (option: TOption) => void;
  /**
   * Called when Escape is pressed before selecting an option.
   */
  onCancel?: () => void;
}

/**
 * Renders a numbered keyboard prompt for short disambiguation lists.
 *
 * @param props - Prompt title, options, and callbacks.
 * @returns React element for a numbered selection prompt.
 */
export function NumberedSelectionPrompt<TOption extends NumberedSelectionOption>(
  props: NumberedSelectionPromptProps<TOption>,
): React.ReactElement {
  useInput((input, key) => {
    if (key.escape) {
      props.onCancel?.();
      return;
    }

    const selectedNumber = Number.parseInt(input, 10);
    if (!Number.isInteger(selectedNumber)) {
      return;
    }

    const option = props.options[selectedNumber - 1];
    if (option != null) {
      props.onSelect(option);
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{props.title}</Text>
      {props.options.map((option, index) => (
        <Text key={option.id}>
          {index + 1}. {option.label}
        </Text>
      ))}
      <Text color="gray">Press a number to select, Esc to cancel.</Text>
    </Box>
  );
}
