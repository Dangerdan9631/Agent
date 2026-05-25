import type { LlmPrompt } from '../../../domain/llm/llm-prompt.js';
import { runCliPrompt } from '../cli-process-runner.js';
import { formatPrompt, type LlmProvider, type LlmProviderModel } from '../llm-provider.js';

export class CursorCliProvider implements LlmProvider {
  readonly providerName = 'cursor-cli';
  readonly models: LlmProviderModel[] = [
    { name: 'auto', difficulty: 'low', thinking: 'none' },
    { name: 'auto', difficulty: 'medium', thinking: 'low' },
    { name: 'auto', difficulty: 'high', thinking: 'medium' },
  ];

  runPrompt(model: LlmProviderModel, prompt: LlmPrompt, signal?: AbortSignal): Promise<string> {
    return runCliPrompt(this.providerName, { command: 'agent', args: ['-p', formatPrompt(prompt), '--model', model.name] }, '', signal);
  }
}
