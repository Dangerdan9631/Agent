import { AgentInterface, type OutputHandler } from './base.js';
import type { Message } from '../model/message.js';

export class CopilotCliAgent extends AgentInterface {
  spawn(): Promise<void> {
    throw new Error('CopilotCliAgent: not implemented');
  }
  send(_message: Message): Promise<void> {
    throw new Error('CopilotCliAgent: not implemented');
  }
  terminate(): Promise<void> {
    throw new Error('CopilotCliAgent: not implemented');
  }
  onOutput(_handler: OutputHandler): () => void {
    throw new Error('CopilotCliAgent: not implemented');
  }
}
