import { z } from 'zod';
import { AgentTypeSchema } from './agent.js';

export const CreateAgentCommandSchema = z.object({
  method: z.literal('agent.create'),
  params: z.object({ type: AgentTypeSchema }),
});

export const TerminateAgentCommandSchema = z.object({
  method: z.literal('agent.terminate'),
  params: z.object({ id: z.string() }),
});

export const SendMessageCommandSchema = z.object({
  method: z.literal('agent.sendMessage'),
  params: z.object({ id: z.string(), content: z.string() }),
});

export const ListAgentsCommandSchema = z.object({
  method: z.literal('agent.list'),
  params: z.object({}).optional(),
});

export const AttachStreamCommandSchema = z.object({
  method: z.literal('agent.attachStream'),
  params: z.object({ id: z.string() }),
});

export const ShutdownCommandSchema = z.object({
  method: z.literal('service.shutdown'),
  params: z.object({}).optional(),
});

export const CommandSchema = z.discriminatedUnion('method', [
  CreateAgentCommandSchema,
  TerminateAgentCommandSchema,
  SendMessageCommandSchema,
  ListAgentsCommandSchema,
  AttachStreamCommandSchema,
  ShutdownCommandSchema,
]);
export type Command = z.infer<typeof CommandSchema>;
