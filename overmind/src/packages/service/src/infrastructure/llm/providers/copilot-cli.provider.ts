import type { LlmPrompt } from '../../../domain/llm/llm-prompt.js';
import { runCliPrompt } from '../cli-process-runner.js';
import { formatPrompt, type LlmProvider, type LlmProviderModel } from '../llm-provider.js';

export class CopilotCliProvider implements LlmProvider {
  readonly providerName = 'copilot-cli';
  readonly models: LlmProviderModel[] = [{ name: 'gpt-5-mini', difficulty: 'low', thinking: 'none' }];

  runPrompt(model: LlmProviderModel, prompt: LlmPrompt, signal?: AbortSignal): Promise<string> {
    const args = ['copilot', '--', '-p', `"${formatPrompt(prompt)}"`, '-s', '--allow-all-tools', '--model', model.name];
    if (model.thinking !== 'none') {
      args.push('--effort', model.thinking);
    }

    return runCliPrompt(this.providerName, { command: 'gh', args }, '', signal);
  }
}
