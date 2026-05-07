import { formatPrompt, runCliPrompt, type LlmModel, type LlmPrompt, type LlmProvider } from './types.js';

export class ClaudeCodeProvider implements LlmProvider {
  readonly providerName = 'claude-code';
  readonly models: LlmModel[] = [
    { name: 'sonnet', difficulty: 'low', thinking: 'none' },
    { name: 'sonnet', difficulty: 'medium', thinking: 'medium' },
    { name: 'opus', difficulty: 'high', thinking: 'high' },
  ];

  runPrompt(model: LlmModel, prompt: LlmPrompt): Promise<string> {
    const args = ['--print', '--model', model.name, '--dangerously-skip-permissions'];
    if (model.thinking !== 'none') {
      args.push('--effort', model.thinking);
    }
    return runCliPrompt(this.providerName, { command: 'claude', args }, formatPrompt(prompt));
  }
}
