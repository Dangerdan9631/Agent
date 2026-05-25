import type { LlmPrompt } from '../../../domain/llm/llm-prompt.js';
import { runCliPrompt } from '../cli-process-runner.js';
import { formatPrompt, type LlmProvider, type LlmProviderModel } from '../llm-provider.js';

export class ClaudeCodeProvider implements LlmProvider {
  readonly providerName = 'claude-code';
  readonly models: LlmProviderModel[] = [
    { name: 'sonnet', difficulty: 'low', thinking: 'none' },
    { name: 'sonnet', difficulty: 'medium', thinking: 'medium' },
    { name: 'opus', difficulty: 'high', thinking: 'high' },
  ];

  runPrompt(model: LlmProviderModel, prompt: LlmPrompt, signal?: AbortSignal): Promise<string> {
    const args = ['--print', '--model', model.name, '--dangerously-skip-permissions'];
    if (model.thinking !== 'none') {
      args.push('--effort', model.thinking);
    }

    return runCliPrompt(this.providerName, { command: 'claude', args }, formatPrompt(prompt), signal);
  }
}
