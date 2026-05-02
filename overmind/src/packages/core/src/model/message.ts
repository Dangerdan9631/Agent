import { z } from 'zod';

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.number(),
});
export type Message = z.infer<typeof MessageSchema>;

export const StreamChunkSchema = z.object({
  agentId: z.string(),
  chunk: z.string(),
  done: z.boolean().default(false),
});
export type StreamChunk = z.infer<typeof StreamChunkSchema>;
