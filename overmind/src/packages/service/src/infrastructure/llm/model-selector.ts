import type { LlmDifficulty, LlmPrompt, LlmThinkingLevel } from '../../domain/llm/llm-prompt.js';
import type { LlmProviderModel } from './llm-provider.js';

const DIFFICULTY_RANK: Record<LlmDifficulty, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const THINKING_RANK: Record<LlmThinkingLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function selectModel(models: readonly LlmProviderModel[], prompt: LlmPrompt): LlmProviderModel | undefined {
  return [...models].sort((left, right) => modelScore(left, prompt) - modelScore(right, prompt))[0];
}

function modelScore(model: LlmProviderModel, prompt: LlmPrompt): number {
  const difficultyDelta = DIFFICULTY_RANK[model.difficulty] - DIFFICULTY_RANK[prompt.difficulty];
  const thinkingDelta = THINKING_RANK[model.thinking] - THINKING_RANK[prompt.thinking];
  const underpoweredPenalty = (difficultyDelta < 0 ? 10 : 0) + (thinkingDelta < 0 ? 5 : 0);

  return Math.abs(difficultyDelta) * 2 + Math.abs(thinkingDelta) + underpoweredPenalty;
}
