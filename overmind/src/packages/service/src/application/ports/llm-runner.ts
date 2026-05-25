import type { LlmPrompt } from '../../domain/llm/llm-prompt.js';

export interface LlmRunner {
  run(prompt: LlmPrompt, signal?: AbortSignal): Promise<string>;
}
