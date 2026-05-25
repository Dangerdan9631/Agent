export type LlmDifficulty = 'low' | 'medium' | 'high';
export type LlmThinkingLevel = 'none' | 'low' | 'medium' | 'high';

export interface LlmPrompt {
  prompt: string;
  context: string;
  difficulty: LlmDifficulty;
  thinking: LlmThinkingLevel;
}
