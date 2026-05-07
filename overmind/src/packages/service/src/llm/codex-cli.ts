import { formatPrompt, runCliPrompt, type LlmModel, type LlmPrompt, type LlmProvider } from './types.js';

export class CodexCliProvider implements LlmProvider {
  readonly providerName = 'codex-cli';
  readonly models: LlmModel[] = [
    { name: 'gpt-5.4-mini', difficulty: 'low', thinking: 'none' },
    { name: 'gpt-5.4', difficulty: 'medium', thinking: 'medium' },
    { name: 'gpt-5.5', difficulty: 'high', thinking: 'high' },
  ];

  runPrompt(model: LlmModel, prompt: LlmPrompt): Promise<string> {
    return runCliPrompt(this.providerName, { command: 'codex', args: ['exec', '-m', model.name, '--ask-for-approval', 'never', '-'] }, formatPrompt(prompt));
  }
}
