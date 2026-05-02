import { randomUUID } from 'crypto';
import {
  AgentId,
  AgentInfo,
  AgentType,
  AgentInterface,
  CursorSdkAgent,
  GeminiCliAgent,
  CodexCliAgent,
  ClaudeCliAgent,
  CopilotCliAgent,
  WindsurfCliAgent,
} from 'overmind';
import {
  createAgentService,
  getServiceState,
  type AgentService,
} from './machines/agent-machine.js';

interface AgentEntry {
  info: AgentInfo;
  service: AgentService;
  agentInterface: AgentInterface;
  streamHandlers: Set<(chunk: string, done: boolean) => void>;
}

export class AgentManager {
  private agents = new Map<string, AgentEntry>();

  createAgent(type: AgentType): AgentInfo {
    const id = randomUUID() as AgentId;
    const agentInterface = this.buildAgentInterface(type);

    const info: AgentInfo = {
      id,
      type,
      state: 'init',
      createdAt: Date.now(),
    };

    const service = createAgentService((newState) => {
      const entry = this.agents.get(id);
      if (entry) {
        entry.info = { ...entry.info, state: newState };
      }
    });

    this.agents.set(id, { info, service, agentInterface, streamHandlers: new Set() });

    service.send('INITIALIZED');
    info.state = getServiceState(service);

    return { ...info };
  }

  terminateAgent(id: string): void {
    const entry = this.agents.get(id);
    if (!entry) throw new Error(`Agent not found: ${id}`);
    entry.service.send('TERMINATE');
    entry.agentInterface.terminate().catch(() => {
      // ignore; transition to terminated regardless
    });
    entry.service.send('DONE');
  }

  sendMessage(id: string, content: string): void {
    const entry = this.agents.get(id);
    if (!entry) throw new Error(`Agent not found: ${id}`);
    entry.service.send('SEND_MESSAGE');
    const message = { role: 'user' as const, content, timestamp: Date.now() };
    entry.agentInterface
      .send(message)
      .catch(() => {/* agent not yet implemented */})
      .finally(() => entry.service.send('RESPONSE_RECEIVED'));
  }

  listAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).map((e) => ({
      ...e.info,
      state: getServiceState(e.service),
    }));
  }

  attachStream(id: string, handler: (chunk: string, done: boolean) => void): () => void {
    const entry = this.agents.get(id);
    if (!entry) throw new Error(`Agent not found: ${id}`);
    entry.streamHandlers.add(handler);
    const unsubscribeOutput = entry.agentInterface.onOutput(handler);
    return () => {
      entry.streamHandlers.delete(handler);
      unsubscribeOutput();
    };
  }

  getAgentInfo(id: string): AgentInfo | undefined {
    const entry = this.agents.get(id);
    if (!entry) return undefined;
    return { ...entry.info, state: getServiceState(entry.service) };
  }

  getStats(): { agentCount: number; uptime: number } {
    return {
      agentCount: this.agents.size,
      uptime: process.uptime(),
    };
  }

  private buildAgentInterface(type: AgentType): AgentInterface {
    switch (type) {
      case 'cursor-sdk':    return new CursorSdkAgent();
      case 'gemini-cli':    return new GeminiCliAgent();
      case 'codex-cli':     return new CodexCliAgent();
      case 'claude-cli':    return new ClaudeCliAgent();
      case 'copilot-cli':   return new CopilotCliAgent();
      case 'windsurf-cli':  return new WindsurfCliAgent();
    }
  }
}
