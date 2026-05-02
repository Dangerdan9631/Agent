import net from 'net';
import {
  SOCKET_PATH,
  encodeMessage,
  decodeMessages,
  IpcRequestSchema,
  AgentTypeSchema,
} from 'overmind';
import { AgentManager } from './agent-manager.js';

export class IpcServer {
  private server: net.Server;
  private agentManager: AgentManager;

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  listen(socketPath: string = SOCKET_PATH): void {
    this.server.listen(socketPath, () => {
      console.log(`[overmind-service] Listening on ${socketPath}`);
    });

    this.server.on('error', (err) => {
      console.error('[overmind-service] Server error:', err);
    });
  }

  close(callback?: () => void): void {
    this.server.close(callback);
  }

  private handleConnection(socket: net.Socket): void {
    let buffer = '';

    socket.on('data', (chunk) => {
      const { messages, remaining } = decodeMessages(chunk.toString(), buffer);
      buffer = remaining;
      for (const msg of messages) {
        this.handleRequest(socket, msg);
      }
    });

    socket.on('error', () => {/* client disconnected */});
  }

  private handleRequest(socket: net.Socket, msg: unknown): void {
    const parsed = IpcRequestSchema.safeParse(msg);
    if (!parsed.success) return;

    const { id, method, params } = parsed.data;

    this.route(socket, method, params)
      .then((result) => {
        if (socket.writable) {
          socket.write(encodeMessage({ id, result }));
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (socket.writable) {
          socket.write(encodeMessage({ id, error: { code: -1, message } }));
        }
      });
  }

  private async route(socket: net.Socket, method: string, params: unknown): Promise<unknown> {
    const p = params as Record<string, unknown>;

    switch (method) {
      case 'agent.create': {
        const typeResult = AgentTypeSchema.safeParse(p?.type);
        if (!typeResult.success) throw new Error('Invalid agent type');
        return this.agentManager.createAgent(typeResult.data);
      }

      case 'agent.terminate': {
        if (typeof p?.id !== 'string') throw new Error('Missing agent id');
        this.agentManager.terminateAgent(p.id);
        return null;
      }

      case 'agent.sendMessage': {
        if (typeof p?.id !== 'string') throw new Error('Missing agent id');
        if (typeof p?.content !== 'string') throw new Error('Missing message content');
        this.agentManager.sendMessage(p.id, p.content);
        return null;
      }

      case 'agent.list': {
        return this.agentManager.listAgents();
      }

      case 'agent.attachStream': {
        if (typeof p?.id !== 'string') throw new Error('Missing agent id');
        const agentId = p.id;
        const unsubscribe = this.agentManager.attachStream(agentId, (chunk, done) => {
          if (socket.writable) {
            socket.write(encodeMessage({ event: 'stream.chunk', data: { agentId, chunk, done } }));
          }
        });
        socket.on('close', unsubscribe);
        return { subscribed: true };
      }

      case 'service.stats': {
        return this.agentManager.getStats();
      }

      case 'service.shutdown': {
        setImmediate(() => process.exit(0));
        return null;
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}
