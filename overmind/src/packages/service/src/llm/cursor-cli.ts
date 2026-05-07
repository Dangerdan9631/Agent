import { formatPrompt, runCliPrompt, type LlmModel, type LlmPrompt, type LlmProvider } from './types.js';

export class CursorCliProvider implements LlmProvider {
  readonly providerName = 'cursor-cli';
  readonly models: LlmModel[] = [
    { name: 'auto', difficulty: 'low', thinking: 'none' },
    { name: 'auto', difficulty: 'medium', thinking: 'low' },
    { name: 'auto', difficulty: 'high', thinking: 'medium' },
  ];

  runPrompt(model: LlmModel, prompt: LlmPrompt): Promise<string> {
    return runCliPrompt(this.providerName, { command: 'agent', args: ['-p', formatPrompt(prompt), '--model', model.name] }, '');
  }
}
