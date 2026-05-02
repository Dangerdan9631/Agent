import { z } from 'zod';

export const AgentIdSchema = z.string().brand<'AgentId'>();
export type AgentId = z.infer<typeof AgentIdSchema>;

export const AgentStateSchema = z.enum([
  'init',
  'idle',
  'processing',
  'terminating',
  'terminated',
]);
export type AgentState = z.infer<typeof AgentStateSchema>;

export const AgentTypeSchema = z.enum([
  'cursor-sdk',
  'gemini-cli',
  'codex-cli',
  'claude-cli',
  'copilot-cli',
  'windsurf-cli',
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const AgentInfoSchema = z.object({
  id: AgentIdSchema,
  type: AgentTypeSchema,
  state: AgentStateSchema,
  createdAt: z.number(),
});
export type AgentInfo = z.infer<typeof AgentInfoSchema>;
