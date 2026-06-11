import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

import type { PartialRecoveryChoice, PartialRecoveryPrompt } from '../../workflow/engine.js';

const CHOICE_LABELS: Record<PartialRecoveryChoice, string> = {
  restart: 'Restart — overwrite partial artifacts and restart the step',
  cancel: 'Cancel — leave artifacts for inspection (workflow paused)',
  'force-clean': 'Force-clean — delete partial artifacts, then restart',
};

/**
 * Interactive Ink prompt for partial artifact recovery during `/spec-n-roll`.
 *
 * @param prompt - Partial recovery prompt payload from the workflow engine.
 * @returns Promise resolving to the developer's selected recovery action.
 */
export function promptPartialRecovery(prompt: PartialRecoveryPrompt): Promise<PartialRecoveryChoice> {
  return new Promise((resolve, reject) => {
    const app = render(
      <PartialRecoveryPromptView
        prompt={prompt}
        onComplete={(choice) => {
          app.unmount();
          resolve(choice);
        }}
        onCancel={() => {
          app.unmount();
          reject(new Error('Partial recovery prompt cancelled.'));
        }}
      />,
    );
  });
}

/**
 * Props for the partial recovery prompt component.
 */
interface PartialRecoveryPromptViewProps {
  /**
   * Partial recovery prompt payload from the workflow engine.
   */
  prompt: PartialRecoveryPrompt;
  /**
   * Called when the developer confirms a recovery choice.
   */
  onComplete: (choice: PartialRecoveryChoice) => void;
  /**
   * Called when the developer cancels the prompt.
   */
  onCancel: () => void;
}

/**
 * Ink UI offering restart, cancel, and force-clean choices for one partial step.
 */
function PartialRecoveryPromptView({
  prompt,
  onComplete,
  onCancel,
}: PartialRecoveryPromptViewProps): React.ReactElement {
  const choices = [...prompt.choices];
  const [cursorIndex, setCursorIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setCursorIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (key.downArrow) {
      setCursorIndex((index) => Math.min(choices.length - 1, index + 1));
      return;
    }

    if (key.return) {
      const choice = choices[cursorIndex];
      if (choice != null) {
        onComplete(choice);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text>
        Partial artifacts detected for step &quot;{prompt.stepId}&quot;. Choose one action (↑/↓,
        enter confirm, esc cancel):
      </Text>
      {prompt.partialArtifacts.map((artifact) => (
        <Text key={artifact.relativePath}> - {artifact.relativePath}</Text>
      ))}
      {choices.map((choice, index) => {
        const pointer = index === cursorIndex ? '>' : ' ';
        return (
          <Text key={choice}>
            {pointer} {CHOICE_LABELS[choice]}
          </Text>
        );
      })}
    </Box>
  );
}
