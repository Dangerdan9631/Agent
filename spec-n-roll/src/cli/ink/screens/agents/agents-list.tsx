import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import { listAgentSummaries, type AgentSummary } from '../../read-models/agents.js';

/**
 * Formats the configuration state for an agent row.
 *
 * @param agent - Agent summary to describe.
 * @returns Human-readable configuration marker.
 */
function agentState(agent: AgentSummary): string {
  return agent.isConfigured ? 'configured' : 'available';
}

/**
 * Renders bundled and configured agents with a local configured-only toggle.
 *
 * @returns React element for the agents list screen.
 */
export function AgentsListScreen(): React.ReactElement {
  const session = useSession();
  const [configuredOnly, setConfiguredOnly] = useState(false);
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((input) => {
    if (input === 't') {
      setConfiguredOnly((current) => !current);
      return;
    }

    if (input === 'a') {
      session.pushRoute('agent-add');
      return;
    }

    if (input === 'r') {
      session.pushRoute('agent-remove');
    }
  });

  useEffect(() => {
    let active = true;
    void listAgentSummaries(session.projectRoot, { configuredOnly })
      .then((result) => {
        if (active) {
          setAgents(result);
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const message =
            unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(message);
        }
      });

    return () => {
      active = false;
    };
  }, [configuredOnly, session.projectRoot]);

  return (
    <Box flexDirection="column">
      <Text bold>Agents</Text>
      <Text color="gray">
        filter: {configuredOnly ? 'configured' : 'all'} (t toggle, a add, r remove)
      </Text>
      {error != null ? <Text color="red">{error}</Text> : null}
      {agents == null ? <Text color="gray">Loading agents...</Text> : null}
      {agents?.map((agent) => (
        <Text key={agent.agentId}>
          {agent.agentId} - {agent.displayName} - {agentState(agent)}
        </Text>
      ))}
    </Box>
  );
}
