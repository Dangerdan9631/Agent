import type { Message } from '../model/message.js';

export type OutputHandler = (chunk: string, done: boolean) => void;

export abstract class AgentInterface {
  abstract spawn(): Promise<void>;
  abstract send(message: Message): Promise<void>;
  abstract terminate(): Promise<void>;
  abstract onOutput(handler: OutputHandler): () => void;
}
