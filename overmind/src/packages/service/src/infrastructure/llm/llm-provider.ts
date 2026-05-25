import type { LlmDifficulty, LlmPrompt, LlmThinkingLevel } from '../../domain/llm/llm-prompt.js';

export interface LlmProviderModel {
  name: string;
  difficulty: LlmDifficulty;
  thinking: LlmThinkingLevel;
}

export interface LlmProvider {
  readonly providerName: string;
  readonly models: readonly LlmProviderModel[];
  runPrompt(model: LlmProviderModel, prompt: LlmPrompt, signal?: AbortSignal): Promise<string>;
}

export interface CliCommand {
  command: string;
  args: string[];
}

export function formatPrompt(prompt: LlmPrompt): string {
  const context = prompt.context.trim();
  if (!context) {
    return prompt.prompt;
  }

  return `Context:\n${context}\n\nPrompt:\n${prompt.prompt}`;
}
