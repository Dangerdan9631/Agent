import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

import {
  runConfigAgentAdd,
  type ConfigAgentAddResult,
} from '../../../commands/config-agent-add.js';
import {
  AgentSingleSelectPrompt,
  type AgentSingleSelectPromptProps,
} from '../../add-agent-prompt.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { listAgentSummaries } from '../../read-models/agents.js';

/**
 * Input accepted by the interactive agent add mutation path.
 */
export interface InteractiveAgentAddInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Bundled agent ids to add to project configuration.
   */
  agents: string[];
}

/**
 * Applies the interactive agent add mutation through the CLI command orchestrator.
 *
 * @param input - Project root and selected agent ids.
 * @returns Add-agent orchestration result.
 */
export async function applyInteractiveAgentAdd(
  input: InteractiveAgentAddInput,
): Promise<ConfigAgentAddResult> {
  return runConfigAgentAdd(input);
}

/**
 * Renders the reused add-agent picker component with project-aware available choices.
 *
 * @returns React element for the add-agent screen.
 */
export function AgentAddScreen(_props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const [availableAgentIds, setAvailableAgentIds] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listAgentSummaries(session.projectRoot)
      .then((agents) => {
        if (active) {
          setAvailableAgentIds(
            agents.filter((agent) => !agent.isConfigured).map((agent) => agent.agentId),
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

  const completeSelection: AgentSingleSelectPromptProps['onComplete'] = (agentId) => {
    setError(null);
    void applyInteractiveAgentAdd({ projectRoot: session.projectRoot, agents: [agentId] })
      .then((result) => {
        setMessage(
          result.agents
            .map((agent) =>
              agent.alreadyConfigured
                ? `${agent.agentId}: already configured`
                : `${agent.agentId}: added`,
            )
            .join(', '),
        );
        setAvailableAgentIds((current) => current?.filter((id) => id !== agentId) ?? null);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      });
  };

  return (
    <Box flexDirection="column">
      <Text bold>Add Agent</Text>
      {availableAgentIds == null ? <Text color="gray">Loading available agents...</Text> : null}
      {availableAgentIds != null && availableAgentIds.length === 0 ? (
        <Text color="gray">All agents are already configured.</Text>
      ) : null}
      {availableAgentIds != null && availableAgentIds.length > 0 ? (
        <AgentSingleSelectPrompt
          availableAgentIds={availableAgentIds}
          onComplete={completeSelection}
          onCancel={session.popRoute}
        />
      ) : null}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
