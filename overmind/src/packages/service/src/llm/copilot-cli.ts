import { formatPrompt, runCliPrompt, type LlmModel, type LlmPrompt, type LlmProvider } from './types.js';

export class CopilotCliProvider implements LlmProvider {
  readonly providerName = 'copilot-cli';
  readonly models: LlmModel[] = [
    { name: 'gpt-5-mini', difficulty: 'low', thinking: 'none' },
  ];

  runPrompt(model: LlmModel, prompt: LlmPrompt): Promise<string> {
    const args = ['copilot', '--', '-p', `\"${formatPrompt(prompt)}\"`, '-s', '--allow-all-tools', '--model', model.name];
    if (model.thinking !== 'none') {
      args.push('--effort', model.thinking);
    }
    return runCliPrompt(this.providerName, { command: 'gh', args }, '');
  }
}
