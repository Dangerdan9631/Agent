import React, { useState } from 'react';
import { Box, Text } from 'ink';

import { listBundledAgentIds } from '../../../sdk/agents/extension-loader.js';
import { runInit, type InitResult } from '../../../sdk/init.js';
import { AgentMultiSelectPrompt, promptForAgentSelection } from '../../init-prompts.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';

/**
 * Input accepted by the interactive init path.
 */
export interface InteractiveInitInput {
  /**
   * Absolute path to the project directory to initialize.
   */
  projectRoot: string;
  /**
   * Optional selected agent ids; omitted values trigger the reused init prompt.
   */
  agents?: string[];
}

/**
 * Applies interactive initialization through the init command orchestrator.
 *
 * @param input - Project root and optional selected agent ids.
 * @returns Init orchestration summary.
 */
export async function applyInteractiveInit(input: InteractiveInitInput): Promise<InitResult> {
  const agents = input.agents ?? (await promptForAgentSelection(listBundledAgentIds()));
  return runInit({ projectRoot: input.projectRoot, agents });
}

/**
 * Renders the reused agent selection prompt and initializes the current project.
 *
 * @returns React element for the init screen.
 */
export function SetupInitScreen(_props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const initialize = (agents: string[]): void => {
    setRunning(true);
    setError(null);
    void applyInteractiveInit({ projectRoot: session.projectRoot, agents })
      .then((result) => {
        setMessage(`initialized for agents: ${result.selectedAgents.join(', ')}`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      })
      .finally(() => {
        setRunning(false);
      });
  };

  return (
    <Box flexDirection="column">
      <Text bold>Initialize Project</Text>
      {message == null && !running ? (
        <AgentMultiSelectPrompt
          availableAgentIds={listBundledAgentIds()}
          onComplete={initialize}
          onCancel={session.popRoute}
        />
      ) : null}
      {running ? <Text color="gray">Initializing project...</Text> : null}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
