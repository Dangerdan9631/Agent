import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RouteId } from '../../app/navigation.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import type {
  ContextContentState,
  SelectedOptionContext,
} from '../../components/ContextContent.js';
import {
  appendBackMenuItem,
  isBackMenuItem,
  type BackMenuItem,
} from '../../components/menu/back-menu-item.js';
import { listAgentSummaries, type AgentSummary } from '../../read-models/agents.js';

/**
 * Selectable agent row with its backing summary.
 */
interface AgentListItem extends SelectableListItem {
  /**
   * Read-only agent summary represented by this row.
   */
  summary: AgentSummary;
}

/**
 * Props for the agents list screen.
 */
export type AgentsListScreenProps = RoutedScreenProps;

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
 * Builds read-only focus context for an agent row.
 *
 * @param agent - Agent summary to describe.
 * @param configuredOnly - Whether the screen is currently filtering to configured agents only.
 * @returns Selected option context derived from agent metadata and project configuration.
 */
function agentContext(agent: AgentSummary, configuredOnly: boolean): SelectableListItem['context'] {
  return {
    id: `agent:${agent.agentId}`,
    title: `Agent ${agent.agentId}`,
    summary: `${agent.displayName} is ${agentState(agent)} in this project.`,
    status: agent.isConfigured ? 'Configured and enabled.' : 'Bundled but not configured.',
    details: [
      configuredOnly ? 'Shown in configured-only filter.' : 'Shown in all agents filter.',
      `Command generation: ${agent.isEnabled ? 'enabled' : 'disabled'}.`,
    ],
    nextStep: 'Use add or remove shortcuts to change project configuration.',
  };
}

/**
 * Builds selectable agent rows from summaries.
 *
 * @param agents - Agent summaries to render.
 * @param configuredOnly - Whether the screen is currently filtering to configured agents only.
 * @returns Selectable rows for the agents list.
 */
function buildAgentItems(
  agents: readonly AgentSummary[],
  configuredOnly: boolean,
): readonly AgentListItem[] {
  return agents.map((agent) => ({
    id: agent.agentId,
    label: `${agent.agentId} - ${agent.displayName}`,
    description: agentState(agent),
    context: agentContext(agent, configuredOnly),
    summary: agent,
  }));
}

/**
 * Resolves the parent route id used when building a Back row.
 *
 * @param navigationStack - Current navigation stack entries.
 * @param binaryContext - Active CLI invocation target.
 * @returns Parent route id for the Back row.
 */
function parentRouteId(
  navigationStack: readonly { routeId: RouteId }[],
  binaryContext: 'local' | 'global',
): RouteId {
  return (
    navigationStack.at(-2)?.routeId ?? (binaryContext === 'local' ? 'local-home' : 'global-home')
  );
}

/**
 * Renders and configured agents with a local configured-only toggle.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the agents list screen.
 */
export function AgentsListScreen(props: AgentsListScreenProps): React.ReactElement {
  const session = useSession();
  const [configuredOnly, setConfiguredOnly] = useState(false);
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const dataItems = useMemo(
    () => (agents == null ? [] : buildAgentItems(agents, configuredOnly)),
    [agents, configuredOnly],
  );
  const items = useMemo((): readonly (AgentListItem | BackMenuItem)[] => {
    if (agents == null) {
      return [];
    }

    return appendBackMenuItem(
      dataItems,
      parentRouteId(session.navigationStack, session.binaryContext),
    );
  }, [agents, dataItems, session.binaryContext, session.navigationStack]);
  const backItem = useMemo(
    () => items.find((item): item is BackMenuItem => isBackMenuItem(item)),
    [items],
  );
  const contextState = useMemo(
    (): ContextContentState => ({
      routeTitle: 'Agents',
      fallbackSummary: 'Inspect bundled and configured agents for this project.',
      selectedContext,
    }),
    [selectedContext],
  );
  const reportFocusedContext = useCallback((item: AgentListItem | BackMenuItem | undefined): void => {
    if (item == null || isBackMenuItem(item)) {
      setSelectedContext(undefined);
      return;
    }

    setSelectedContext(item.context);
  }, []);
  const ignoreAgentRowActivation = useCallback(
    (item: AgentListItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
      }
    },
    [session],
  );

  useInput((input) => {
    if (backItem != null && input === backItem.key) {
      session.popRoute();
      return;
    }

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

  if (error != null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Agents</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (agents == null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Agents</Text>
        <Text color="gray">Loading agents...</Text>
      </Box>
    );
  }

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        <Box flexDirection="column">
          <Text color="gray">
            filter: {configuredOnly ? 'configured' : 'all'} (t toggle, a add, r remove)
          </Text>
          {agents.length === 0 ? (
            <SelectableList items={items} onSelect={ignoreAgentRowActivation} />
          ) : (
            <SelectableList
              items={items}
              onFocusChange={reportFocusedContext}
              onSelect={ignoreAgentRowActivation}
            />
          )}
        </Box>
      }
    />
  );
}
