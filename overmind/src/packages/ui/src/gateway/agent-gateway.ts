import { singleton } from 'tsyringe';
import { AgentInfo, AgentInfoSchema, AgentType } from 'overmind';
import type { StreamChunk } from 'overmind';
import { IpcService } from './services/ipc-service.js';

@singleton()
export class AgentGateway {
  constructor(private readonly ipcService: IpcService) {}

  async createAgent(type: AgentType): Promise<AgentInfo> {
    const raw = await this.ipcService.request('agent.create', { type });
    return AgentInfoSchema.parse(raw);
  }

  async terminateAgent(id: string): Promise<void> {
    await this.ipcService.request('agent.terminate', { id });
  }

  async sendMessage(id: string, content: string): Promise<void> {
    await this.ipcService.request('agent.sendMessage', { id, content });
  }

  async listAgents(): Promise<AgentInfo[]> {
    const raw = await this.ipcService.request('agent.list');
    return (raw as unknown[]).map((a) => AgentInfoSchema.parse(a));
  }

  async getStats(): Promise<{ agentCount: number; uptime: number }> {
    return this.ipcService.request('service.stats');
  }

  attachStream(id: string, handler: (chunk: string, done: boolean) => void): () => void {
    this.ipcService.request('agent.attachStream', { id }).catch(() => {/* subscribed */});
    return this.ipcService.subscribe('stream.chunk', (data) => {
      const chunk = data as StreamChunk;
      if (chunk.agentId !== id) return;
      handler(chunk.chunk, chunk.done);
    });
  }
}
