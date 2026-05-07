import type { Difficulty, LlmModel, LlmPrompt, LlmProvider, ThinkingLevel } from './types.js';

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const THINKING_RANK: Record<ThinkingLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export class LlmChain {
  readonly #providers: LlmProvider[];

  constructor(providers: LlmProvider[]) {
    this.#providers = providers;
  }

  async run(prompt: LlmPrompt): Promise<string> {
    if (this.#providers.length === 0) {
      throw new Error('No LLM providers configured.');
    }

    const failures: string[] = [];
    for (const provider of this.#providers) {
      const model = selectModel(provider.models, prompt);
      if (!model) {
        failures.push(`${provider.providerName}: no models available`);
        continue;
      }

      try {
        return await provider.runPrompt(model, prompt);
      } catch (error) {
        failures.push(`${provider.providerName}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    throw new Error(`All LLM providers failed. ${failures.join('; ')}`);
  }
}

export function selectModel(models: readonly LlmModel[], prompt: LlmPrompt): LlmModel | undefined {
  return [...models].sort((a, b) => modelScore(a, prompt) - modelScore(b, prompt))[0];
}

function modelScore(model: LlmModel, prompt: LlmPrompt): number {
  const difficultyDelta = DIFFICULTY_RANK[model.difficulty] - DIFFICULTY_RANK[prompt.difficulty];
  const thinkingDelta = THINKING_RANK[model.thinking] - THINKING_RANK[prompt.thinking];
  const underpoweredPenalty = (difficultyDelta < 0 ? 10 : 0) + (thinkingDelta < 0 ? 5 : 0);

  return Math.abs(difficultyDelta) * 2 + Math.abs(thinkingDelta) + underpoweredPenalty;
}
