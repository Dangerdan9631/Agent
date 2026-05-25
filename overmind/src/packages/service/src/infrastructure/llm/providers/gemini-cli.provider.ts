import type { LlmPrompt } from '../../../domain/llm/llm-prompt.js';
import { runCliPrompt } from '../cli-process-runner.js';
import { formatPrompt, type LlmProvider, type LlmProviderModel } from '../llm-provider.js';

export class GeminiCliProvider implements LlmProvider {
  readonly providerName = 'gemini-cli';
  readonly models: LlmProviderModel[] = [
    { name: 'gemini-2.5-flash', difficulty: 'low', thinking: 'none' },
    { name: 'gemini-2.5-flash', difficulty: 'medium', thinking: 'low' },
    { name: 'gemini-2.5-pro', difficulty: 'high', thinking: 'high' },
  ];

  runPrompt(model: LlmProviderModel, prompt: LlmPrompt, signal?: AbortSignal): Promise<string> {
    return runCliPrompt(this.providerName, { command: 'gemini', args: ['-p', formatPrompt(prompt), '--model', model.name] }, '', signal);
  }
}
