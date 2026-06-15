import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

import { getBundledAgentGenerator } from '../../sdk/agents/extension-loader.js';

/**
 * Resolves a display label for a agent id.
 *
 * @param agentId - Extension id.
 * @returns Human-readable agent name when available.
 */
export function agentLabel(agentId: string): string {
  const generator = getBundledAgentGenerator(agentId);
  return generator?.manifest.name ?? agentId;
}

/**
 * Interactive Ink flow for selecting one agent to add.
 *
 * @param availableAgentIds - Agent ids that can be added.
 * @returns Promise resolving to the selected agent id.
 */
export function promptForAgentToAdd(availableAgentIds: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const app = render(
      <AgentSingleSelectPrompt
        availableAgentIds={availableAgentIds}
        onComplete={(selected) => {
          app.unmount();
          resolve(selected);
        }}
        onCancel={() => {
          app.unmount();
          reject(new Error('Agent selection cancelled.'));
        }}
      />,
    );
  });
}

/**
 * Props for the single-select agent picker component.
 */
export interface AgentSingleSelectPromptProps {
  /**
   * Agent ids available for selection.
   */
  availableAgentIds: string[];
  /**
   * Called when the user confirms a selected agent.
   */
  onComplete: (agentId: string) => void;
  /**
   * Called when the user cancels the prompt.
   */
  onCancel: () => void;
}

/**
 * Ink UI that selects one agent with arrow keys and enter.
 */
export function AgentSingleSelectPrompt({
  availableAgentIds,
  onComplete,
  onCancel,
}: AgentSingleSelectPromptProps): React.ReactElement {
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
      setCursorIndex((index) => Math.min(availableAgentIds.length - 1, index + 1));
      return;
    }

    if (key.return) {
      const agentId = availableAgentIds[cursorIndex];
      if (agentId != null) {
        onComplete(agentId);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Select an agent to add (↑/↓ move, enter confirm, esc cancel):</Text>
      {availableAgentIds.map((agentId, index) => {
        const pointer = index === cursorIndex ? '>' : ' ';
        return (
          <Text key={agentId}>
            {pointer} {agentLabel(agentId)} ({agentId})
          </Text>
        );
      })}
    </Box>
  );
}
