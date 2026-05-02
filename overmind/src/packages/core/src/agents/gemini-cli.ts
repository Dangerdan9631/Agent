import { AgentInterface, type OutputHandler } from './base.js';
import type { Message } from '../model/message.js';

export class GeminiCliAgent extends AgentInterface {
  spawn(): Promise<void> {
    throw new Error('GeminiCliAgent: not implemented');
  }
  send(_message: Message): Promise<void> {
    throw new Error('GeminiCliAgent: not implemented');
  }
  terminate(): Promise<void> {
    throw new Error('GeminiCliAgent: not implemented');
  }
  onOutput(_handler: OutputHandler): () => void {
    throw new Error('GeminiCliAgent: not implemented');
  }
}
