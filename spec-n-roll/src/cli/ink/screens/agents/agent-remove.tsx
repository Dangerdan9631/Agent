import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

import {
  runConfigAgentRemove,
  type ConfigAgentRemoveResult,
} from '../../../commands/config-agent-remove.js';
import { useSession } from '../../app/session-context.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { listAgentSummaries } from '../../read-models/agents.js';

/**
 * Input accepted by the interactive agent remove mutation path.
 */
export interface InteractiveAgentRemoveInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Bundled agent ids to remove from project configuration.
   */
  agents: string[];
  /**
   * Called before destructive removal; must resolve true to continue.
   */
  confirmRemoval: () => Promise<boolean> | boolean;
}

/**
 * Selectable configured agent row for the removal screen.
 */
interface RemovableAgentItem extends SelectableListItem {
  /**
   * Bundled agent id passed to the removal orchestrator.
   */
  agentId: string;
}

/**
 * Applies the interactive agent removal through the CLI command orchestrator.
 *
 * @param input - Project root, selected agents, and confirmation callback.
 * @returns Remove-agent orchestration result.
 */
export async function applyInteractiveAgentRemove(
  input: InteractiveAgentRemoveInput,
): Promise<ConfigAgentRemoveResult> {
  const confirmed = await input.confirmRemoval();
  if (!confirmed) {
    throw new Error('Agent removal cancelled.');
  }

  return runConfigAgentRemove({ projectRoot: input.projectRoot, agents: input.agents });
}

/**
 * Renders configured agents with explicit confirmation before removal.
 *
 * @returns React element for the remove-agent screen.
 */
export function AgentRemoveScreen(): React.ReactElement {
  const session = useSession();
  const [items, setItems] = useState<RemovableAgentItem[] | null>(null);
  const [pendingAgent, setPendingAgent] = useState<RemovableAgentItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listAgentSummaries(session.projectRoot, { configuredOnly: true })
      .then((agents) => {
        if (active) {
          setItems(
            agents.map((agent) => ({
              id: agent.agentId,
              agentId: agent.agentId,
              label: agent.displayName,
              description: agent.agentId,
            })),
          );
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(text);
        }
      });

    return () => {
      active = false;
    };
  }, [session.projectRoot]);

  const removePending = (): void => {
    if (pendingAgent == null) {
      return;
    }

    const agentId = pendingAgent.agentId;
    setError(null);
    void applyInteractiveAgentRemove({
      projectRoot: session.projectRoot,
      agents: [agentId],
      confirmRemoval: () => true,
    })
      .then((result) => {
        setMessage(
          result.agents
            .map((agent) =>
              agent.notConfigured
                ? `${agent.agentId}: not configured`
                : `${agent.agentId}: removed`,
            )
            .join(', '),
        );
        setItems((current) => current?.filter((item) => item.agentId !== agentId) ?? null);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      })
      .finally(() => {
        setPendingAgent(null);
      });
  };

  if (pendingAgent != null) {
    return (
      <ConfirmDialog
        title="Remove agent?"
        message={`Remove ${pendingAgent.agentId} generated files and configuration.`}
        onConfirm={removePending}
        onCancel={() => {
          setPendingAgent(null);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Remove Agent</Text>
      {items == null ? <Text color="gray">Loading configured agents...</Text> : null}
      {items != null && items.length === 0 ? <Text color="gray">No configured agents.</Text> : null}
      {items != null && items.length > 0 ? (
        <SelectableList items={items} onSelect={setPendingAgent} />
      ) : null}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
