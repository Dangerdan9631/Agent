import type { LlmPrompt } from '../../../domain/llm/llm-prompt.js';
import { runCliPrompt } from '../cli-process-runner.js';
import { formatPrompt, type LlmProvider, type LlmProviderModel } from '../llm-provider.js';

export class CodexCliProvider implements LlmProvider {
  readonly providerName = 'codex-cli';
  readonly models: LlmProviderModel[] = [
    { name: 'gpt-5.4-mini', difficulty: 'low', thinking: 'none' },
    { name: 'gpt-5.4', difficulty: 'medium', thinking: 'medium' },
    { name: 'gpt-5.5', difficulty: 'high', thinking: 'high' },
  ];

  runPrompt(model: LlmProviderModel, prompt: LlmPrompt, signal?: AbortSignal): Promise<string> {
    return runCliPrompt(
      this.providerName,
      { command: 'codex', args: ['exec', '-m', model.name, '--ask-for-approval', 'never', '-'] },
      formatPrompt(prompt),
      signal,
    );
  }
}
