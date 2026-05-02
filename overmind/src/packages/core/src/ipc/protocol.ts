import { z } from 'zod';
import os from 'os';
import path from 'path';

export const SOCKET_PATH =
  process.platform === 'win32'
    ? '\\\\.\\pipe\\overmind'
    : path.join(os.tmpdir(), 'overmind.sock');

export const IpcRequestSchema = z.object({
  id: z.string(),
  method: z.string(),
  params: z.unknown().optional(),
});
export type IpcRequest = z.infer<typeof IpcRequestSchema>;

export const IpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
});
export type IpcError = z.infer<typeof IpcErrorSchema>;

export const IpcResponseSchema = z.object({
  id: z.string(),
  result: z.unknown().optional(),
  error: IpcErrorSchema.optional(),
});
export type IpcResponse = z.infer<typeof IpcResponseSchema>;

export const IpcEventSchema = z.object({
  event: z.string(),
  data: z.unknown(),
});
export type IpcEvent = z.infer<typeof IpcEventSchema>;

export function encodeMessage(msg: IpcRequest | IpcResponse | IpcEvent): string {
  return JSON.stringify(msg) + '\n';
}

export function decodeMessages(
  chunk: string,
  buffer: string
): { messages: unknown[]; remaining: string } {
  const combined = buffer + chunk;
  const lines = combined.split('\n');
  const remaining = lines.pop() ?? '';
  const messages: unknown[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      try {
        messages.push(JSON.parse(trimmed));
      } catch {
        // skip malformed lines
      }
    }
  }
  return { messages, remaining };
}
