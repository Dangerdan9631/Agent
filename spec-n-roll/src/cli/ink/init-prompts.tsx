import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

import { getBundledAgentGenerator } from '../../sdk/agents/extension-loader.js';

/**
 * Resolves a display label for a agent id.
 *
 * @param agentId - Extension id.
 * @returns Human-readable agent name when available.
 */
function agentLabel(agentId: string): string {
  const generator = getBundledAgentGenerator(agentId);
  return generator?.manifest.name ?? agentId;
}

/**
 * Interactive Ink flow for selecting one or more agents during init.
 *
 * @param availableAgentIds - Agent ids that can be selected.
 * @returns Promise resolving to the selected agent id list.
 */
export function promptForAgentSelection(availableAgentIds: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const app = render(
      <AgentMultiSelectPrompt
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
 * Props for the multi-select agent picker component.
 */
export interface AgentMultiSelectPromptProps {
  /**
   * Agent ids available for selection.
   */
  availableAgentIds: string[];
  /**
   * Called when the user confirms at least one selected agent.
   */
  onComplete: (selectedAgentIds: string[]) => void;
  /**
   * Called when the user cancels the prompt.
   */
  onCancel: () => void;
}

/**
 * Renders the agent multi-select prompt shared by init flows.
 *
 * @param props - Available agent ids and completion callbacks.
 * @returns React element for the multi-select prompt.
 */
export function AgentMultiSelectPrompt({
  availableAgentIds,
  onComplete,
  onCancel,
}: AgentMultiSelectPromptProps): React.ReactElement {
  const [cursorIndex, setCursorIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

    if (input === ' ') {
      const agentId = availableAgentIds[cursorIndex];
      if (agentId == null) {
        return;
      }
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(agentId)) {
          next.delete(agentId);
        } else {
          next.add(agentId);
        }
        return next;
      });
      return;
    }

    if (key.return) {
      if (selected.size === 0) {
        return;
      }
      onComplete([...selected]);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Select agents (↑/↓ move, space toggle, enter confirm, esc cancel):</Text>
      {availableAgentIds.map((agentId, index) => {
        const marker = selected.has(agentId) ? '[x]' : '[ ]';
        const pointer = index === cursorIndex ? '>' : ' ';
        return (
          <Text key={agentId}>
            {pointer} {marker} {agentLabel(agentId)} ({agentId})
          </Text>
        );
      })}
    </Box>
  );
}
