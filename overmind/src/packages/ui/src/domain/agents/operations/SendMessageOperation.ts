import { singleton } from 'tsyringe';
import { AgentGateway } from '../../../gateway/agent-gateway.js';

@singleton()
export class SendMessageOperation {
  constructor(private readonly agentGateway: AgentGateway) {}

  async execute(agentId: string, content: string): Promise<void> {
    await this.agentGateway.sendMessage(agentId, content);
  }
}
