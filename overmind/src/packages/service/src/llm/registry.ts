import { ClaudeCodeProvider } from './claude-code.js';
import { CodexCliProvider } from './codex-cli.js';
import { CopilotCliProvider } from './copilot-cli.js';
import { CursorCliProvider } from './cursor-cli.js';
import { GeminiCliProvider } from './gemini-cli.js';
import type { LlmProvider } from './types.js';
import { WindsurfCliProvider } from './windsurf-cli.js';

export const llmProviders: Record<string, LlmProvider> = {
  'cursor-cli': new CursorCliProvider(),
  'copilot-cli': new CopilotCliProvider(),
  'claude-code': new ClaudeCodeProvider(),
  'gemini-cli': new GeminiCliProvider(),
  'codex-cli': new CodexCliProvider(),
  'windsurf-cli': new WindsurfCliProvider(),
};

export function getLlmProvider(name: string): LlmProvider {
  const provider = llmProviders[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }

  return provider;
}
