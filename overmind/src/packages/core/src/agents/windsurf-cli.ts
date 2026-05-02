import { AgentInterface, type OutputHandler } from './base.js';
import type { Message } from '../model/message.js';

export class WindsurfCliAgent extends AgentInterface {
  spawn(): Promise<void> {
    throw new Error('WindsurfCliAgent: not implemented');
  }
  send(_message: Message): Promise<void> {
    throw new Error('WindsurfCliAgent: not implemented');
  }
  terminate(): Promise<void> {
    throw new Error('WindsurfCliAgent: not implemented');
  }
  onOutput(_handler: OutputHandler): () => void {
    throw new Error('WindsurfCliAgent: not implemented');
  }
}
