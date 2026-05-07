import { formatPrompt, runCliPrompt, type LlmModel, type LlmPrompt, type LlmProvider } from './types.js';

export class WindsurfCliProvider implements LlmProvider {
  readonly providerName = 'windsurf-cli';
  readonly models: LlmModel[] = [
    { name: 'auto', difficulty: 'low', thinking: 'none' },
    { name: 'auto', difficulty: 'medium', thinking: 'low' },
    { name: 'auto', difficulty: 'high', thinking: 'medium' },
  ];

  runPrompt(model: LlmModel, prompt: LlmPrompt): Promise<string> {
    return runCliPrompt(this.providerName, { command: 'devin', args: ['-p', formatPrompt(prompt), '--model', model.name, '--permission-mode', 'bypass'] }, '');
  }
}
