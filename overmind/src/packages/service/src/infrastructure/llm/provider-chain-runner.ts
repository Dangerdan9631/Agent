import type { LlmRunner } from '../../application/ports/llm-runner.js';
import type { LlmPrompt, LlmThinkingLevel } from '../../domain/llm/llm-prompt.js';
import type { ConfiguredLlmAgent, ConfiguredLlmChain, OvermindConfig } from '../config/overmind-config-loader.js';
import type { LlmProvider, LlmProviderModel } from './llm-provider.js';
import { selectModel } from './model-selector.js';
import { ClaudeCodeProvider } from './providers/claude-code.provider.js';
import { CodexCliProvider } from './providers/codex-cli.provider.js';
import { CopilotCliProvider } from './providers/copilot-cli.provider.js';
import { CursorCliProvider } from './providers/cursor-cli.provider.js';
import { GeminiCliProvider } from './providers/gemini-cli.provider.js';
import { WindsurfCliProvider } from './providers/windsurf-cli.provider.js';

type ProviderMap = Record<string, LlmProvider>;

const DIFFICULTY_RANK: Record<'trivial' | 'easy' | 'medium' | 'hard', number> = {
  trivial: 0,
  easy: 1,
  medium: 2,
  hard: 3,
};

const PROMPT_DIFFICULTY_RANK = {
  low: 1,
  medium: 2,
  high: 3,
};

const THINKING_RANK: Record<LlmThinkingLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export class ProviderChainRunner implements LlmRunner {
  constructor(
    private readonly config: OvermindConfig['llm'],
    private readonly providers: ProviderMap,
  ) {}

  async run(prompt: LlmPrompt, signal?: AbortSignal): Promise<string> {
    const configuredAgents = this.getCandidateAgents(prompt);
    if (configuredAgents.length === 0) {
      throw new Error('No LLM providers configured.');
    }

    const failures: string[] = [];
    for (const configuredAgent of configuredAgents) {
      const provider = this.providers[configuredAgent.agent.agent];
      if (!provider) {
        failures.push(`${configuredAgent.agent.agent}: unknown provider`);
        continue;
      }

      const promptForAgent: LlmPrompt = {
        ...prompt,
        thinking: configuredAgent.agent.thinking ?? prompt.thinking,
      };

      const model = selectConfiguredModel(provider, configuredAgent.agent, promptForAgent);
      if (!model) {
        failures.push(`${provider.providerName}: no models available`);
        continue;
      }

      try {
        return await provider.runPrompt(model, promptForAgent, signal);
      } catch (error) {
        failures.push(`${provider.providerName}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    throw new Error(`All LLM providers failed. ${failures.join('; ')}`);
  }

  private getCandidateAgents(prompt: LlmPrompt): Array<{ chain: ConfiguredLlmChain; agent: ConfiguredLlmAgent }> {
    const matchingChains = this.config.chain.filter((chain) => chainMatchesPrompt(chain, prompt));
    const chains = matchingChains.length > 0 ? matchingChains : this.config.chain;
    return chains.flatMap((chain) => chain.agents.map((agent) => ({ chain, agent })));
  }
}

export function createLlmRunner(config: OvermindConfig['llm']): ProviderChainRunner {
  return new ProviderChainRunner(config, {
    'claude-code': new ClaudeCodeProvider(),
    'codex-cli': new CodexCliProvider(),
    'copilot-cli': new CopilotCliProvider(),
    'cursor-cli': new CursorCliProvider(),
    'gemini-cli': new GeminiCliProvider(),
    'windsurf-cli': new WindsurfCliProvider(),
  });
}

function chainMatchesPrompt(chain: ConfiguredLlmChain, prompt: LlmPrompt): boolean {
  const difficultyLimit = chain.difficulty ? DIFFICULTY_RANK[chain.difficulty] : Number.POSITIVE_INFINITY;
  const effortLimit = chain.effort ? THINKING_RANK[chain.effort] : Number.POSITIVE_INFINITY;
  return PROMPT_DIFFICULTY_RANK[prompt.difficulty] <= difficultyLimit && THINKING_RANK[prompt.thinking] <= effortLimit;
}

function selectConfiguredModel(provider: LlmProvider, agent: ConfiguredLlmAgent, prompt: LlmPrompt): LlmProviderModel | undefined {
  const namedModels = provider.models.filter((model) => model.name === agent.model);
  if (namedModels.length > 0) {
    return selectModel(namedModels, prompt);
  }

  return selectModel(provider.models, prompt);
}
