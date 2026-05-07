import { formatPrompt, runCliPrompt, type LlmModel, type LlmPrompt, type LlmProvider } from './types.js';

export class GeminiCliProvider implements LlmProvider {
  readonly providerName = 'gemini-cli';
  readonly models: LlmModel[] = [
    { name: 'gemini-2.5-flash', difficulty: 'low', thinking: 'none' },
    { name: 'gemini-2.5-flash', difficulty: 'medium', thinking: 'low' },
    { name: 'gemini-2.5-pro', difficulty: 'high', thinking: 'high' },
  ];

  runPrompt(model: LlmModel, prompt: LlmPrompt): Promise<string> {
    return runCliPrompt(this.providerName, { command: 'gemini', args: ['-p', formatPrompt(prompt), '--model', model.name] }, '');
  }
}
